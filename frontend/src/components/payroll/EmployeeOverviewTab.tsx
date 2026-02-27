/**
 * Employee Overview Tab - displays employee cards and stats
 */

import React, { useState, useEffect } from "react";
import { Users, User, Clock, Award, CheckCircle, XCircle, UserCheck, UserPlus, Edit2, Loader2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/Button";
import EmployeeCard from "./EmployeeCard";
import StatCard from "./StatCard";
import EmployeeDetailsModal from "./EmployeeDetailsModal";
import EmployeeEditModal from "./EmployeeEditModal";
import AddEmployeeModal from "./AddEmployeeModal";
import type { Employee } from "@/lib/payroll-calendar/types";

type EmployeeView = "deployed" | "pending";

export default function EmployeeOverviewTab() {
    const toast = useToast();
    const [view, setView] = useState<EmployeeView>("deployed");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

    // Fetch data from backend
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const deployedRes = await apiFetch('/employees/deployed');
            const deployedData = await deployedRes.json();

            const pendingRes = await apiFetch('/employees/pending');
            const pendingData = await pendingRes.json();

            if (!Array.isArray(deployedData) || !Array.isArray(pendingData)) {
                throw new Error("Invalid data format from server");
            }

            const normalize = (emp: any): Employee => ({
                ...emp,
                hoursThisWeek: emp.hoursThisWeek || 0,
                performance: emp.performance || 0,
                salary: emp.salary || (emp.employeeProfile?.baseSalary) || 0,
                department: emp.department || (emp.employeeProfile?.department?.name) || "Operations",
                role: emp.role || (emp.employeeProfile?.jobTitle) || "Member",
                avatar: emp.avatar || (emp.name?.[0] || "U"),
                status: emp.status || "active",
                email: emp.email || "no-email@company.com"
            });

            setEmployees(deployedData.map(normalize));
            setPendingEmployees(pendingData.map(normalize));
        } catch (err: any) {
            console.error("Failed to fetch employees", err);
            toast.error(err.message === "Failed to fetch" ? "Connection failed" : "Failed to load employees");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleViewDetails = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowDetailsModal(true);
    };

    const handleEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowEditModal(true);
    };

    const handleSaveEmployee = async (employeeId: string | number, updates: Partial<Employee>) => {
        try {
            await apiFetch(`/users/${employeeId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });

            setEmployees((prev) =>
                prev.map((emp) =>
                    emp.id === employeeId ? { ...emp, ...updates } : emp
                )
            );
            setPendingEmployees((prev) =>
                prev.map((emp) =>
                    emp.id === employeeId ? { ...emp, ...updates } : emp
                )
            );

            toast.success("Employee updated successfully");
        } catch (err) {
            console.error("Update failed", err);
            toast.error("Failed to update employee");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!employeeToDelete) return;

        try {
            await apiFetch(`/users/${employeeToDelete.id}`, {
                method: 'DELETE',
            });

            setEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id));
            setPendingEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id));

            toast.success(`${employeeToDelete.name} has been removed`);
            setEmployeeToDelete(null);
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to remove employee");
        }
    };

    const handleAddEmployee = async (newEmployeeData: Omit<Employee, "id">) => {
        try {
            const res = await apiFetch('/employees/request-verification', {
                method: 'POST',
                body: JSON.stringify(newEmployeeData),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Application submitted for ${newEmployeeData.name}!`);
                fetchData();
            } else {
                throw new Error(data.message || "Failed to submit application");
            }
        } catch (err: any) {
            console.error("Submission failed", err);
            toast.error(err.message || "Failed to submit application");
        }
    };

    const handleApproveEmployee = async (employee: Employee) => {
        try {
            await apiFetch(`/employees/approve/${employee.id}`, {
                method: 'POST',
            });

            toast.success(`${employee.name} has been approved and deployed!`);
            fetchData();
        } catch (err) {
            console.error("Approval failed", err);
            toast.error("Failed to approve employee");
        }
    };

    const handleRejectEmployee = async (employee: Employee) => {
        try {
            await apiFetch(`/employees/reject/${employee.id}`, {
                method: 'POST',
            });

            toast.info(`Application for ${employee.name} has been rejected`);
            fetchData();
        } catch (err) {
            console.error("Rejection failed", err);
            toast.error("Failed to reject employee");
        }
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

    if (isLoading && employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-[var(--muted)]">Loading employee data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                    {displayEmployees.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
                            <p className="text-[var(--muted)]">No deployed employees found.</p>
                        </div>
                    )}
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
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                                                {employee.avatar && (employee.avatar.startsWith('http') || employee.avatar.startsWith('/')) ? (
                                                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{employee.avatar}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h3 className="font-semibold text-[var(--foreground)] truncate">
                                                    {employee.name}
                                                </h3>
                                                <p className="text-sm text-[var(--muted)] truncate">
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
                                                ₱{employee.salary.toLocaleString()}
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
