/**
 * Employee Overview Tab - displays employee cards and stats
 */

import React, { useState } from "react";
import { Users, User, Clock, Award, Plus } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/Button";
import EmployeeCard from "./EmployeeCard";
import StatCard from "./StatCard";
import EmployeeDetailsModal from "./EmployeeDetailsModal";
import EmployeeEditModal from "./EmployeeEditModal";
import AddEmployeeModal from "./AddEmployeeModal";
import { MOCK_EMPLOYEES } from "@/lib/payroll-calendar/mock-data";
import type { Employee } from "@/lib/payroll-calendar/types";

export default function EmployeeOverviewTab() {
  const toast = useToast();
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
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

  const handleAddEmployee = (newEmployee: Omit<Employee, "id">) => {
    // Generate new ID (in production, this would come from the backend)
    const newId = Math.max(...employees.map((e) => e.id), 0) + 1;
    
    const employeeWithId: Employee = {
      ...newEmployee,
      id: newId,
    };
    
    setEmployees((prev) => [...prev, employeeWithId]);
    toast.success(`${newEmployee.name} has been added to the team!`);
  };

  const avgHours = Math.round(
    employees.reduce((acc, emp) => acc + emp.hoursThisWeek, 0) /
      employees.length
  );

  const avgPerformance = Math.round(
    employees.reduce((acc, emp) => acc + emp.performance, 0) /
      employees.length
  );

  return (
    <div className="space-y-6">
      {/* Employee Stats */}
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

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onViewDetails={() => handleViewDetails(employee)}
            onEdit={() => handleEdit(employee)}
            onDelete={() => setEmployeeToDelete(employee)}
          />
        ))}
      </div>

      {/* Add Employee Button */}
      <div className="flex justify-center">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add New Employee
        </Button>
      </div>

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
