/**
 * Employee Overview Tab - displays employee cards and stats
 */

import React, { useState } from "react";
import { Users, User, Clock, Award, Plus, CheckCircle, XCircle, UserCheck, UserPlus, Edit2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/Button";
import EmployeeCard from "./EmployeeCard";
import StatCard from "./StatCard";
import EmployeeDetailsModal from "./EmployeeDetailsModal";
import EmployeeEditModal from "./EmployeeEditModal";
import AddEmployeeModal from "./AddEmployeeModal";
import { MOCK_EMPLOYEES, MOCK_PENDING_EMPLOYEES } from "@/lib/payroll-calendar/mock-data";
import type { Employee } from "@/lib/payroll-calendar/types";

type EmployeeView = "deployed" | "pending";

export default function EmployeeOverviewTab() {
  const toast = useToast();
  const [view, setView] = useState<EmployeeView>("deployed");
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [pendingEmployees, setPendingEmployees] = useState(MOCK_PENDING_EMPLOYEES);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleSaveEmployee = (employeeId: number, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, ...updates } : emp
      )
    );
    toast.success("Employee updated successfully");
  };

  const handleDeleteConfirm = () => {
    if (!employeeToDelete) return;

    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id));
    toast.success(`${employeeToDelete.name} has been removed`);
    setEmployeeToDelete(null);
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, "id">) => {
    // Generate new ID (in production, this would come from the backend)
    const newId = Math.max(...employees.map((e) => e.id), 0) + 1;

    const employeeWithId: Employee = {
      ...newEmployee,
      id: newId,
      status: "pending", // New employees start as pending
      appliedDate: new Date().toISOString().split("T")[0],
    };

    setPendingEmployees((prev) => [...prev, employeeWithId]);
    toast.success(`Application submitted for ${newEmployee.name}!`);

    // Send verification email
    try {
      await apiFetch('/employees/request-verification', {
        method: 'POST',
        body: JSON.stringify(newEmployee),
      });
      toast.success("Verification request sent to Operations Manager");
    } catch (err) {
      console.error("Failed to send verification email", err);
      toast.error("Application submitted, but failed to send verification email.");
    }
  };

  const handleApproveEmployee = (employee: Employee) => {
    // Move from pending to deployed
    setPendingEmployees((prev) => prev.filter((emp) => emp.id !== employee.id));
    setEmployees((prev) => [...prev, { ...employee, status: "active" }]);
    toast.success(`${employee.name} has been approved and deployed!`);
  };

  const handleRejectEmployee = (employee: Employee) => {
    // Remove from pending
    setPendingEmployees((prev) => prev.filter((emp) => emp.id !== employee.id));
    toast.info(`Application for ${employee.name} has been rejected`);
  };

  const avgHours = Math.round(
    employees.length > 0
      ? employees.reduce((acc, emp) => acc + emp.hoursThisWeek, 0) / employees.length
      : 0
  );

  const avgPerformance = Math.round(
    employees.length > 0
      ? employees.reduce((acc, emp) => acc + emp.performance, 0) / employees.length
      : 0
  );

  const displayEmployees = view === "deployed" ? employees : pendingEmployees;

  return (
    <div className="space-y-6">
      {/* View Toggle Tabs */}
      <div className="flex items-center gap-3 p-1 bg-[var(--card-surface)] rounded-lg border border-[var(--border)] w-fit">
        <Button
          variant={view === "deployed" ? "primary" : "ghost"}
          size="sm"
          icon={<UserCheck className="w-4 h-4" />}
          onClick={() => setView("deployed")}
        >
          Deployed Employees
        </Button>
        <Button
          variant={view === "pending" ? "primary" : "ghost"}
          size="sm"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setView("pending")}
          className={pendingEmployees.length > 0 ? "relative" : ""}
        >
          Pending Applications
          {pendingEmployees.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
              {pendingEmployees.length}
            </span>
          )}
        </Button>
      </div>
      {/* Employee Stats */}
      {view === "deployed" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5" aria-hidden="true" />}
            label="Total Employees"
            value={employees.length}
            bgColor="bg-blue-500"
          />
          <StatCard
            icon={<User className="w-5 h-5" aria-hidden="true" />}
            label="Active"
            value={employees.filter((emp) => emp.status === "active").length}
            bgColor="bg-emerald-500"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" aria-hidden="true" />}
            label="Avg Hours/Week"
            value={avgHours}
            bgColor="bg-amber-500"
          />
          <StatCard
            icon={<Award className="w-5 h-5" aria-hidden="true" />}
            label="Avg Performance"
            value={`${avgPerformance}%`}
            bgColor="bg-purple-500"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<UserPlus className="w-5 h-5" aria-hidden="true" />}
            label="Pending Applications"
            value={pendingEmployees.length}
            bgColor="bg-orange-500"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" aria-hidden="true" />}
            label="Awaiting Review"
            value={pendingEmployees.filter((emp) => emp.appliedDate).length}
            bgColor="bg-blue-500"
          />
          <StatCard
            icon={<Users className="w-5 h-5" aria-hidden="true" />}
            label="Total Deployed"
            value={employees.length}
            bgColor="bg-emerald-500"
          />
        </div>
      )}

      {/* Employee Cards */}
      {view === "deployed" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onViewDetails={() => handleViewDetails(employee)}
              onEdit={() => handleEdit(employee)}
              onDelete={() => setEmployeeToDelete(employee)}
            />
          ))}
        </div>
      ) : (
        <>
          {pendingEmployees.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-[var(--muted)]" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                No Pending Applications
              </h3>
              <p className="text-sm text-[var(--muted)]">
                All employee applications have been processed
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-[var(--card-bg)] rounded-lg border-2 border-dashed border-orange-500/30 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
                        {employee.avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {employee.name}
                        </h3>
                        <p className="text-sm text-[var(--muted)]">
                          {employee.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1.5 rounded-lg hover:bg-[var(--card-surface)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                        title="Edit Employee"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                        Pending
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Department</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {employee.department}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Email</span>
                      <span className="font-medium text-[var(--foreground)] truncate ml-2">
                        {employee.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Salary</span>
                      <span className="font-medium text-[var(--foreground)]">
                        ${employee.salary.toLocaleString()}
                      </span>
                    </div>
                    {employee.appliedDate && (
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Applied</span>
                        <span className="font-medium text-[var(--foreground)]">
                          {new Date(employee.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={() => handleApproveEmployee(employee)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<XCircle className="w-4 h-4" />}
                      onClick={() => handleRejectEmployee(employee)}
                      className="flex-1 text-red-600 dark:text-red-400 border-red-600/30 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Employee Button - Only show in pending view */}
      {view === "pending" && (
        <div className="flex justify-center">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Submit New Application
          </Button>
        </div>
      )}

      {/* Modals */}
      <EmployeeDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />

      <EmployeeEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEmployee}
      />

      {/* Delete Confirmation Dialog */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-bg)] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">
              Remove Employee?
            </h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              Are you sure you want to remove <strong>{employeeToDelete.name}</strong> from the system? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setEmployeeToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
