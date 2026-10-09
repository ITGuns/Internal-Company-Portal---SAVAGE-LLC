"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Button from "@/components/Button";
import { PayrollCalendarBodySkeleton } from "@/components/ui/FeatureSkeletons";
import { useToast } from "@/components/ToastProvider";
import { Calendar as CalendarIcon, Users, FileText, BarChart3, Plus, Timer, ClipboardCheck } from "lucide-react";
import { type PayrollEventType } from "@/lib/payroll-events";
import type { PayrollTab, CalendarEvent } from "@/lib/payroll-calendar/types";
import { usePayrollData } from "@/lib/payroll-calendar/usePayrollData";
import { useCalendarEvents } from "@/lib/payroll-calendar/useCalendarEvents";
import EmployeeOverviewTab from "../../components/payroll/EmployeeOverviewTab";
import PayslipsTab from "@/components/payroll/PayslipsTab";
import ReportsTab from "@/components/payroll/ReportsTab";
import SchedulerTab from "@/components/payroll/SchedulerTab";
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
import {
  canReviewTimeRequests,
  hasPayrollManagementAccess as getHasManagementAccess,
} from "@/lib/role-access";
import { apiFetch } from "@/lib/api";
import { useTimeRequests } from "@/components/payroll/useTimeRequests";
import { listOvertimeRequests } from "@/lib/overtime-requests";
import { listAdjustmentRequests } from "@/lib/adjustment-requests";
import { countPending, DEFAULT_BILLABLE_CAP_HOURS } from "@/lib/time-requests";

// Lazy-loaded heavy components (CalendarTab has FullCalendar, modals are only shown on interaction)
const CalendarTab = dynamic(() => import("@/components/payroll/CalendarTab"), { ssr: false });
const AddTimeEntryModal = dynamic(() => import("@/components/payroll/AddTimeEntryModal"), { ssr: false });
const AddEventModal = dynamic(() => import("@/components/payroll/AddEventModal"), { ssr: false });
const ApprovalsTab = dynamic(() => import("@/components/payroll/ApprovalsTab"), { ssr: false });
const MyTimeRequests = dynamic(() => import("@/components/payroll/MyTimeRequests"), { ssr: false });

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
  // Management or payroll roles edit time directly and review requests; everyone else files requests.
  const canReview = canReviewTimeRequests(user);
  const currentUserId = user?.id != null ? String(user.id) : undefined;
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [ownCapHours, setOwnCapHours] = useState(DEFAULT_BILLABLE_CAP_HOURS);
  // Any reviewer may pick a person: non-payroll reviewers can only edit other people's time.
  const targetUserId = canReview && selectedAuditUserId ? selectedAuditUserId : undefined;
  const selectedPayrollUser = payrollUsers.find((payrollUser) => String(payrollUser.id) === targetUserId);
  const auditEmployeeLabel = selectedPayrollUser?.name || selectedPayrollUser?.email || "selected employee";
  const isOwnTimeView = !targetUserId || targetUserId === currentUserId;
  // Self-review rule: only payroll roles edit their own entries; everyone else files a request.
  const canEditVisibleEntries = canReview && (hasManagementAccess || !isOwnTimeView);
  // Requests of the person whose time is shown (employees always get their own rows).
  const shownUserId = targetUserId ?? currentUserId;
  const timeRequests = useTimeRequests(canReview ? shownUserId : undefined, Boolean(currentUserId));
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
      setActiveTab(getPayrollTabFromSearch(searchParams, hasManagementAccess, canReview));
    }
    if (searchParams.has("view")) {
      setEmployeeOverviewView(getEmployeeOverviewViewFromSearch(searchParams));
    }

    const auditTarget = getPayrollAuditTarget({
      searchParams,
      currentUserId,
      hasManagementAccess: canReview,
    });
    const auditRange = getPayrollAuditDateRange(searchParams);
    setSelectedAuditUserId(searchParams.has("userId") && auditTarget.targetUserId ? auditTarget.targetUserId : "");
    setAuditStartDate(auditRange.startDate);
    setAuditEndDate(auditRange.endDate);
  }, [currentUserId, hasManagementAccess, canReview]);

  const refreshPendingApprovals = useCallback(async () => {
    try {
      const [overtime, corrections] = await Promise.all([
        listOvertimeRequests({ status: "pending" }),
        listAdjustmentRequests({ status: "pending" }),
      ]);
      setPendingApprovals(countPending(overtime) + countPending(corrections));
    } catch {
      // The badge is a hint only; the Approvals tab shows its own error state.
      setPendingApprovals(0);
    }
  }, []);

  useEffect(() => {
    if (canReview) void refreshPendingApprovals();
  }, [canReview, refreshPendingApprovals]);

  // The daily cap of the person whose time is shown: employees need it for
  // "Request overtime", reviewers for the billable / overtime split.
  useEffect(() => {
    if (!shownUserId) return;
    let isMounted = true;
    setOwnCapHours(DEFAULT_BILLABLE_CAP_HOURS);
    apiFetch(`/payroll/config/${encodeURIComponent(shownUserId)}`)
      .then((res) => res.json())
      .then((profile: { maxBillableHoursPerDay?: number } | null) => {
        const cap = Number(profile?.maxBillableHoursPerDay);
        if (isMounted && Number.isFinite(cap) && cap > 0) setOwnCapHours(cap);
      })
      .catch(() => {
        // Fall back to the default cap; the server validates overtime hours anyway.
      });
    return () => {
      isMounted = false;
    };
  }, [shownUserId]);

  useEffect(() => {
    if (!canReview) {
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
  }, [canReview, showErrorToast]);

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
            {canReview && (
              <Button
                variant={activeTab === "approvals" ? "primary" : "outline"}
                size="md"
                icon={<ClipboardCheck className="w-4 h-4" />}
                onClick={() => setActiveTab("approvals")}
                aria-label={pendingApprovals > 0 ? `Approvals, ${pendingApprovals} pending` : "Approvals"}
              >
                Approvals
                {pendingApprovals > 0 && (
                  <span aria-hidden="true" className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                    {pendingApprovals}
                  </span>
                )}
              </Button>
            )}
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
                <Button
                  variant={activeTab === "scheduler" ? "primary" : "outline"}
                  size="md"
                  icon={<Timer className="w-4 h-4" />}
                  onClick={() => setActiveTab("scheduler")}
                >
                  Scheduler
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
          {canReview && activeTab === "calendar" && (
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
            loading ? (
              <PayrollCalendarBodySkeleton />
            ) : (
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
                canEditEntries={canEditVisibleEntries}
                capHours={ownCapHours}
                overtimeRequests={timeRequests.overtime}
                correctionRequests={timeRequests.corrections}
                onRequestsChanged={() => void timeRequests.reload()}
              />
            )
          )}
          {activeTab === "calendar" && isOwnTimeView && !loading && (
            <MyTimeRequests
              overtime={timeRequests.overtime}
              corrections={timeRequests.corrections}
              loading={timeRequests.loading}
              error={timeRequests.error}
            />
          )}

          {canReview && activeTab === "approvals" && (
            <ApprovalsTab people={payrollUsers} onPendingCountChange={setPendingApprovals} />
          )}
          {hasManagementAccess && activeTab === "employees" && (
            <EmployeeOverviewTab initialView={employeeOverviewView} />
          )}
          {hasManagementAccess && activeTab === "payslips" && <PayslipsTab />}
          {hasManagementAccess && activeTab === "reports" && <ReportsTab />}
          {hasManagementAccess && activeTab === "scheduler" && <SchedulerTab />}
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
