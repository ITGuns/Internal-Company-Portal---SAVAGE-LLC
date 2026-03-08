"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/components/ToastProvider";
import { Calendar as CalendarIcon, Users, FileText, BarChart3, Plus } from "lucide-react";
import { type PayrollEventType } from "@/lib/payroll-events";
import type { PayrollTab, CalendarEvent } from "@/lib/payroll-calendar/types";
import { usePayrollData } from "@/lib/payroll-calendar/usePayrollData";
import { useCalendarEvents } from "@/lib/payroll-calendar/useCalendarEvents";
import CalendarTab from "@/components/payroll/CalendarTab";
import EmployeeOverviewTab from "../../components/payroll/EmployeeOverviewTab";
import PayslipsTab from "@/components/payroll/PayslipsTab";
import ReportsTab from "@/components/payroll/ReportsTab";
import AddTimeEntryModal from "@/components/payroll/AddTimeEntryModal";
import AddEventModal from "@/components/payroll/AddEventModal";
import { useUser } from "@/contexts/UserContext";

export default function PayrollCalendarPage() {
  const { user } = useUser();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<PayrollTab>("calendar");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{
    id: string;
    title: string;
    date: string;
    type: PayrollEventType;
    description?: string;
  } | null>(null);

  // Custom hooks for data management
  const {
    loading,
    clockedIn,
    timeEntries,
    customEvents,
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    createTimeEntry,
    deleteTimeEntry,
    addCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
  } = usePayrollData();

  const {
    events,
    displayEvents,
    stats,
  } = useCalendarEvents(timeEntries, customEvents);

  // RBAC: Check if user has management access (Admin, Genrou, Daryl)
  const userRole = user?.role?.toLowerCase() || 'member';
  const formattedRole = userRole.trim().replace(/ /g, '_');
  const allowedEmails = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'];
  const hasManagementAccess = formattedRole === 'admin' || allowedEmails.includes(user?.email?.toLowerCase() || '');

  // Event handlers
  const handleAddManualEntry = async (
    startIso: string,
    endIso?: string,
    notes?: string,
    userId?: string
  ) => {
    const success = await createTimeEntry(startIso, endIso, notes, userId);
    if (success) {
      toast.success("Time entry added successfully");
    } else {
      toast.error("Failed to add time entry");
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
          <LoadingSpinner message="Loading payroll calendar..." />
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
          <div className="flex items-center gap-2 mb-4">
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
              onDeleteTimeEntry={handleDeleteTimeEntry}
            />
          )}

          {hasManagementAccess && activeTab === "employees" && <EmployeeOverviewTab />}
          {hasManagementAccess && activeTab === "payslips" && <PayslipsTab />}
          {hasManagementAccess && activeTab === "reports" && <ReportsTab />}
        </div>
      </div>

      {/* Modals */}
      <AddTimeEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddManualEntry}
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
