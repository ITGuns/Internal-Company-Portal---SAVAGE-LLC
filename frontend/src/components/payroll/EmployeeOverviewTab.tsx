/**
 * Employee Overview Tab - displays employee cards and stats
 */

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Users, User, Clock, Award, CheckCircle, XCircle, UserCheck, UserPlus, UserX, Edit2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/Button";
import { PayrollEmployeesSectionSkeleton } from "@/components/ui/FeatureSkeletons";
import { useUser } from "@/contexts/UserContext";
import { canManageMemberStatus, hasFullAccess } from "@/lib/role-access";
import { fetchInactiveMembers } from "@/lib/users-admin";
import EmployeeCard from "./EmployeeCard";
import InactiveMembersPanel from "./InactiveMembersPanel";
import type { MemberStatusAction, MemberStatusTarget } from "./MemberStatusModal";
import StatCard from "./StatCard";
import type { Employee } from "@/lib/payroll-calendar/types";
import type { ApiEmployee } from "@/lib/types/api";

// Lazy-loaded modals (only rendered when opened)
const EmployeeDetailsModal = dynamic(() => import("./EmployeeDetailsModal"), { ssr: false });
const EmployeeEditModal = dynamic(() => import("./EmployeeEditModal"), { ssr: false });
const InviteEmployeeModal = dynamic(() => import("./InviteEmployeeModal"), { ssr: false });
const MemberStatusModal = dynamic(() => import("./MemberStatusModal"), { ssr: false });

type EmployeeView = "deployed" | "pending" | "inactive";

interface EmployeeOverviewTabProps {
    initialView?: EmployeeView;
}

export default function EmployeeOverviewTab({ initialView = "deployed" }: EmployeeOverviewTabProps) {
    const toast = useToast();
    const showToastError = toast.error;
    const { user } = useUser();
    const canChangeStatus = canManageMemberStatus(user);
    // Nobody deactivates their own account from this list (they would lock themselves out).
    const isCurrentUser = (memberId: string | number) => user?.id != null && String(memberId) === String(user.id);
    const isAdmin = hasFullAccess(user);
    const [view, setView] = useState<EmployeeView>(initialView);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [statusAction, setStatusAction] = useState<{ action: MemberStatusAction; member: MemberStatusTarget } | null>(null);
    const [inactiveMembers, setInactiveMembers] = useState<MemberStatusTarget[]>([]);
    const [inactiveLoading, setInactiveLoading] = useState(false);
    const [inactiveError, setInactiveError] = useState<string | null>(null);

    const loadInactiveMembers = useCallback(async () => {
        if (!canChangeStatus) return;
        setInactiveLoading(true);
        setInactiveError(null);
        try {
            const rows = await fetchInactiveMembers();
            setInactiveMembers((previous) => {
                // Keep members deactivated in this session even if the server list is not available.
                const merged = new Map(previous.map((member) => [member.id, member]));
                for (const row of rows) {
                    merged.set(String(row.id), { id: String(row.id), name: row.name || row.email, email: row.email });
                }
                return [...merged.values()];
            });
        } catch (err) {
            setInactiveError(err instanceof Error ? err.message : "Could not load inactive members.");
        } finally {
            setInactiveLoading(false);
        }
    }, [canChangeStatus]);

    useEffect(() => {
        if (view === "inactive") void loadInactiveMembers();
    }, [view, loadInactiveMembers]);

    // Fetch data from backend
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const deployedRes = await apiFetch('/employees/deployed');
            const deployedData = await deployedRes.json();

            const pendingRes = await apiFetch('/employees/pending');
            const pendingData = await pendingRes.json();

            if (!Array.isArray(deployedData) || !Array.isArray(pendingData)) {
                throw new Error("Invalid data format from server");
            }

            const normalize = (emp: ApiEmployee): Employee => ({
                ...emp,
                hoursThisWeek: emp.hoursThisWeek || 0,
                performance: typeof emp.performance === "number" ? emp.performance : null,
                salary: emp.salary || (emp.employeeProfile?.baseSalary) || 0,
                department: emp.department || (emp.employeeProfile?.department?.name) || "Operations",
                role: emp.role || (emp.employeeProfile?.jobTitle) || "Member",
                payrollScheme: emp.payrollScheme || emp.employeeProfile?.payrollScheme || "weekdays",
                maxBillableHoursPerDay: emp.maxBillableHoursPerDay || emp.employeeProfile?.maxBillableHoursPerDay || 8,
                avatar: emp.avatar || (emp.name?.[0] || "U"),
                status: (emp.status || "active") as Employee['status'],
                email: emp.email || "no-email@company.com"
            });

            setEmployees(deployedData.map(normalize));
            setPendingEmployees(pendingData.map(normalize));
        } catch (err) {
            console.error("Failed to fetch employees", err);
            showToastError(err instanceof Error && err.message === "Failed to fetch" ? "Connection failed" : "Failed to load employees");
        } finally {
            setIsLoading(false);
        }
    }, [showToastError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setView(initialView);
    }, [initialView]);

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

    const toStatusTarget = (employee: Employee): MemberStatusTarget => ({
        id: String(employee.id),
        name: employee.name,
        email: employee.email,
    });

    const handleStatusDone = (action: MemberStatusAction, member: MemberStatusTarget) => {
        if (action === "deactivate") {
            setEmployees((prev) => prev.filter((emp) => String(emp.id) !== member.id));
            setInactiveMembers((prev) => [...prev.filter((item) => item.id !== member.id), member]);
        } else {
            setInactiveMembers((prev) => prev.filter((item) => item.id !== member.id));
            if (action === "reactivate") void fetchData();
        }
    };

    const handleApproveEmployee = async (employee: Employee) => {
        try {
            await apiFetch(`/employees/approve/${employee.id}`, {
                method: 'POST',
            });

            toast.success(`${employee.name} has been approved and deployed.`);
            fetchData();
        } catch (err) {
            console.error("Approval failed", err);
            toast.error(err instanceof Error ? err.message : "Failed to approve employee");
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

    const trackedPerformance = employees
        .map((emp) => emp.performance)
        .filter((value): value is number => typeof value === "number");

    const avgPerformance = trackedPerformance.length > 0
        ? Math.round(trackedPerformance.reduce((acc, value) => acc + value, 0) / trackedPerformance.length)
        : null;

    const displayEmployees = view === "deployed" ? employees : pendingEmployees;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 p-1 bg-[var(--card-surface)] rounded-lg border border-[var(--border)] w-fit max-w-full">
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
                {canChangeStatus && (
                    <Button
                        variant={view === "inactive" ? "primary" : "ghost"}
                        size="sm"
                        icon={<UserX className="w-4 h-4" />}
                        onClick={() => setView("inactive")}
                    >
                        Inactive
                    </Button>
                )}
            </div>
            {isAdmin && (
                <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowInviteModal(true)}
                >
                    Add employee
                </Button>
            )}
            </div>

            {isLoading && employees.length === 0 ? (
                <PayrollEmployeesSectionSkeleton />
            ) : view === "inactive" ? null : view === "deployed" ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Users className="w-5 h-5" aria-hidden="true" />}
                        label="Total Employees"
                        value={employees.length}
                        bgColor="bg-blue-500"
                    />
                    <StatCard
                        icon={<User className="w-5 h-5" aria-hidden="true" />}
                        label="Verified"
                        value={employees.filter((emp) => emp.status === "active" || emp.status === "verified").length}
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
                        value={avgPerformance === null ? "Not tracked" : `${avgPerformance}%`}
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

            {view === "inactive" && (
                <InactiveMembersPanel
                    members={inactiveMembers}
                    loading={inactiveLoading}
                    error={inactiveError}
                    canHardDelete={isAdmin}
                    onRetry={() => void loadInactiveMembers()}
                    onReactivate={(member) => setStatusAction({ action: "reactivate", member })}
                    onHardDelete={(member) => setStatusAction({ action: "hard_delete", member })}
                />
            )}

            {!isLoading && view !== "inactive" && (view === "deployed" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayEmployees.map((employee) => (
                        <EmployeeCard
                            key={employee.id}
                            employee={employee}
                            onViewDetails={() => handleViewDetails(employee)}
                            onEdit={() => handleEdit(employee)}
                            onDeactivate={canChangeStatus && !isCurrentUser(employee.id)
                                ? () => setStatusAction({ action: "deactivate", member: toStatusTarget(employee) })
                                : undefined}
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
                                                    <Image src={employee.avatar} alt={employee.name} width={48} height={48} className="w-full h-full object-cover" />
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
                                                aria-label={`Edit ${employee.name}`}
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
            ))}

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

            <InviteEmployeeModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvited={() => void fetchData()}
            />

            <MemberStatusModal
                action={statusAction?.action ?? null}
                member={statusAction?.member ?? null}
                onClose={() => setStatusAction(null)}
                onDone={handleStatusDone}
            />

        </div>
    );
}
