"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { Calendar as CalendarIcon, Users, FileText, BarChart3, Plus } from "lucide-react";
import { type PayrollEventType } from "@/lib/payroll-events";
import type { PayrollTab, CalendarEvent } from "@/lib/payroll-calendar/types";
import { usePayrollData } from "@/lib/payroll-calendar/usePayrollData";
import { useCalendarEvents } from "@/lib/payroll-calendar/useCalendarEvents";
import EmployeeOverviewTab from "../../components/payroll/EmployeeOverviewTab";
import PayslipsTab from "@/components/payroll/PayslipsTab";
import ReportsTab from "@/components/payroll/ReportsTab";
import PayrollAuditFilterBar from "@/components/payroll/PayrollAuditFilterBar";
import { useUser } from "@/contexts/UserContext";
import { fetchUsers, type TaskUser } from "@/lib/tasks";
import {
  getEmployeeOverviewViewFromSearch,
  getPayrollTabFromSearch,
  type EmployeeOverviewView,
} from "@/lib/dashboard-deep-links";
import {
  getPayrollAuditDateRange,
  getPayrollAuditTarget,
  getPayrollTimeEntryRange,
} from "@/lib/payroll-calendar/audit-target";
import { hasPayrollManagementAccess as getHasManagementAccess } from "@/lib/role-access";

// Lazy-loaded heavy components (CalendarTab has FullCalendar, modals are only shown on interaction)
const CalendarTab = dynamic(() => import("@/components/payroll/CalendarTab"), { ssr: false });
const AddTimeEntryModal = dynamic(() => import("@/components/payroll/AddTimeEntryModal"), { ssr: false });
const AddEventModal = dynamic(() => import("@/components/payroll/AddEventModal"), { ssr: false });

export default function PayrollCalendarPage() {
  const { user } = useUser();
  const toast = useToast();
  const showErrorToast = toast.error;
  const [activeTab, setActiveTab] = useState<PayrollTab>("calendar");
  const [employeeOverviewView, setEmployeeOverviewView] = useState<EmployeeOverviewView>("deployed");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [payrollUsers, setPayrollUsers] = useState<TaskUser[]>([]);
  const [isLoadingPayrollUsers, setIsLoadingPayrollUsers] = useState(false);
  const [selectedAuditUserId, setSelectedAuditUserId] = useState("");
  const [auditUserSearch, setAuditUserSearch] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<{
    id: string;
    title: string;
    date: string;
    type: PayrollEventType;
    description?: string;
  } | null>(null);

  // RBAC: Check if user has management access
  const hasManagementAccess = getHasManagementAccess(user);
  const currentUserId = user?.id != null ? String(user.id) : undefined;
  const targetUserId = hasManagementAccess && selectedAuditUserId ? selectedAuditUserId : undefined;
  const selectedPayrollUser = payrollUsers.find((payrollUser) => String(payrollUser.id) === targetUserId);
  const auditEmployeeLabel = selectedPayrollUser?.name || selectedPayrollUser?.email || "selected employee";
  const isOwnTimeView = !targetUserId || targetUserId === currentUserId;
  const timeEntryRange = useMemo(
    () => getPayrollTimeEntryRange({ startDate: auditStartDate, endDate: auditEndDate }),
    [auditEndDate, auditStartDate],
  );

  // Custom hooks for data management
  const {
    loading,
    clockedIn,
    timeEntries,
    customEvents,
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    addCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
  } = usePayrollData(targetUserId, timeEntryRange.startIso, timeEntryRange.endIso);

  const {
    events,
    displayEvents,
    stats,
  } = useCalendarEvents(timeEntries, customEvents);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("tab")) {
      setActiveTab(getPayrollTabFromSearch(searchParams, hasManagementAccess));
    }
    if (searchParams.has("view")) {
      setEmployeeOverviewView(getEmployeeOverviewViewFromSearch(searchParams));
    }

    const auditTarget = getPayrollAuditTarget({
      searchParams,
      currentUserId,
      hasManagementAccess,
    });
    const auditRange = getPayrollAuditDateRange(searchParams);
    setSelectedAuditUserId(searchParams.has("userId") && auditTarget.targetUserId ? auditTarget.targetUserId : "");
    setAuditStartDate(auditRange.startDate);
    setAuditEndDate(auditRange.endDate);
  }, [currentUserId, hasManagementAccess]);

  useEffect(() => {
    if (!hasManagementAccess) {
      setPayrollUsers([]);
      setIsLoadingPayrollUsers(false);
      return;
    }

    let isMounted = true;
    setIsLoadingPayrollUsers(true);

    fetchUsers()
      .then((users) => {
        if (isMounted) setPayrollUsers(users);
      })
      .catch(() => {
        if (isMounted) showErrorToast("Failed to load payroll users");
      })
      .finally(() => {
        if (isMounted) setIsLoadingPayrollUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hasManagementAccess, showErrorToast]);

  const updateCalendarQuery = (updates: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setActiveTab("calendar");

    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", "calendar");

    if (updates.userId !== undefined) {
      if (updates.userId) searchParams.set("userId", updates.userId);
      else searchParams.delete("userId");
    }
    if (updates.startDate !== undefined) {
      if (updates.startDate) searchParams.set("start", updates.startDate);
      else searchParams.delete("start");
    }
    if (updates.endDate !== undefined) {
      if (updates.endDate) searchParams.set("end", updates.endDate);
      else searchParams.delete("end");
    }

    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  };

  const handleAuditUserChange = (nextUserId: string) => {
    setSelectedAuditUserId(nextUserId);
    updateCalendarQuery({ userId: nextUserId });
  };

  const handleAuditDateChange = (field: "start" | "end", value: string) => {
    if (field === "start") {
      setAuditStartDate(value);
      updateCalendarQuery({ startDate: value });
    } else {
      setAuditEndDate(value);
      updateCalendarQuery({ endDate: value });
    }
  };

  const handleResetAuditFilters = () => {
    setSelectedAuditUserId("");
    setAuditUserSearch("");
    setAuditStartDate("");
    setAuditEndDate("");
    updateCalendarQuery({ userId: "", startDate: "", endDate: "" });
  };

  // Event handlers
  const handleAddManualEntry = async (
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string
  ) => {
    const success = await createTimeEntry(startIso, endIso, notes, userId || targetUserId);
    if (success) {
      toast.success("Time entry added successfully");
    } else {
      toast.error("Failed to add time entry");
    }
    return success;
  };

  const handleEditManualEntry = async (
    id: string,
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string
  ) => {
    const success = await updateTimeEntry(id, startIso, endIso, notes, userId || targetUserId);
    if (success) {
      toast.success("Time entry updated");
    } else {
      toast.error("Failed to update time entry");
    }
    return success;
  };

  const handleDeleteTimeEntry = async (id: string) => {
    const success = await deleteTimeEntry(id);
    if (success) {
      toast.success("Time entry deleted");
    } else {
      toast.error("Failed to delete entry");
    }
  };

  const handleClockInClick = async () => {
    const result = await handleClockIn();
    if (result.success) {
      toast.success("Clocked in successfully");
    } else {
      toast.error(result.error || "Failed to clock in");
    }
  };

  const handleClockOutClick = async () => {
    const result = await handleClockOut();
    if (result.success) {
      toast.success("Clocked out successfully");
    } else {
      toast.error(result.error || "Failed to clock out");
    }
  };

  const handleEventSubmit = async (
    title: string,
    date: string,
    type: PayrollEventType,
    description?: string
  ) => {
    try {
      if (editingEvent) {
        const success = await updateCustomEvent(editingEvent.id, {
          title,
          date,
          type,
          description,
        });
        if (success) {
          toast.success("Event updated successfully");
        } else {
          toast.error("Failed to update event");
          return false;
        }
      } else {
        const newEvent = await addCustomEvent({ title, date, type, description });
        if (newEvent) {
          toast.success("Event added to calendar");
        } else {
          toast.error("Failed to add event");
          return false;
        }
      }
      setEditingEvent(null);
      return true;
    } catch {
      toast.error("Failed to save event");
      return false;
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (event.extendedProps?.custom && event.extendedProps.customId) {
      // Edit custom event
      const ev = customEvents.find((e) => e.id === event.extendedProps.customId);
      if (ev) {
        setEditingEvent({
          id: ev.id,
          title: ev.title,
          date: ev.date,
          type: ev.type,
          description: ev.description,
        });
        setShowEventModal(true);
      }
    } else {
      // Edit built-in event (creates a copy)
      // Re-add as custom if needed, but we removed the hiding logic
      setShowEventModal(true);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (event.extendedProps?.custom && event.extendedProps.customId) {
      // Delete custom event
      const success = await deleteCustomEvent(event.extendedProps.customId);
      if (success) {
        toast.success("Event deleted");
      } else {
        toast.error("Failed to delete event");
      }
    } else {
      // No-op for built-in as they are gone/managed elsewhere
      toast.success("Event removed from calendar");
    }
  };

  if (loading) {
    return (
      <main
        className="main-content-height bg-[var(--background)] text-[var(--foreground)]"
      >
        <div className="p-6 pt-0">
          <Header
            title="Payroll Calendar"
            subtitle="Track pay periods, deadlines, and holidays"
          />
          <PageSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main
      className="main-content-height bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0 transition-all duration-500">
        <Header
          title="Payroll Calendar"
          subtitle="Track pay periods, deadlines, and holidays"
        />

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant={activeTab === "calendar" ? "primary" : "outline"}
              size="md"
              icon={<CalendarIcon className="w-4 h-4" />}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar
            </Button>
            {hasManagementAccess && (
              <>
                <Button
                  variant={activeTab === "employees" ? "primary" : "outline"}
                  size="md"
                  icon={<Users className="w-4 h-4" />}
                  onClick={() => setActiveTab("employees")}
                >
                  Employee Overview
                </Button>
                <Button
                  variant={activeTab === "payslips" ? "primary" : "outline"}
                  size="md"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={() => setActiveTab("payslips")}
                >
                  Payslips Management
                </Button>
                <Button
                  variant={activeTab === "reports" ? "primary" : "outline"}
                  size="md"
                  icon={<BarChart3 className="w-4 h-4" />}
                  onClick={() => setActiveTab("reports")}
                >
                  Reports
                </Button>
              </>
            )}
            {activeTab === "calendar" && (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowEventModal(true)}
                className="ml-auto"
              >
                Add Event
              </Button>
            )}
          </div>
          {hasManagementAccess && activeTab === "calendar" && (
            <PayrollAuditFilterBar
              payrollUsers={payrollUsers}
              selectedAuditUserId={selectedAuditUserId}
              auditUserSearch={auditUserSearch}
              auditStartDate={auditStartDate}
              auditEndDate={auditEndDate}
              isLoadingPayrollUsers={isLoadingPayrollUsers}
              onSearchChange={setAuditUserSearch}
              onUserChange={handleAuditUserChange}
              onDateChange={handleAuditDateChange}
              onReset={handleResetAuditFilters}
            />
          )}

          {/* Tab Content */}
          {activeTab === "calendar" && (
            <CalendarTab
              displayEvents={displayEvents}
              events={events}
              stats={stats}
              timeEntries={timeEntries}
              clockedIn={clockedIn}
              onTitleChange={() => {/* Calendar updates its own title */ }}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onClockIn={handleClockInClick}
              onClockOut={handleClockOutClick}
              onAddManualEntry={() => setShowAddModal(true)}
              onEditTimeEntry={handleEditManualEntry}
              onDeleteTimeEntry={handleDeleteTimeEntry}
              isOwnTimeView={isOwnTimeView}
              auditEmployeeLabel={auditEmployeeLabel}
            />
          )}

          {hasManagementAccess && activeTab === "employees" && (
            <EmployeeOverviewTab initialView={employeeOverviewView} />
          )}
          {hasManagementAccess && activeTab === "payslips" && <PayslipsTab />}
          {hasManagementAccess && activeTab === "reports" && <ReportsTab />}
        </div>
      </div>

      {/* Modals */}
      <AddTimeEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddManualEntry}
        initialUserId={targetUserId}
        auditContextLabel={!isOwnTimeView ? auditEmployeeLabel : undefined}
      />
      <AddEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        onSubmit={handleEventSubmit}
      />
    </main>
  );
}
