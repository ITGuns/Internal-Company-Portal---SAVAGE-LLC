/**
 * Employee Overview tab: deployed, pending and inactive members, with search,
 * Set Up Payroll and Payroll options for payroll roles (2026-10-20).
 */

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PAYROLL_PROFILE_QUERY_KEY } from "@/lib/payroll-options-api";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/Button";
import { PayrollEmployeesSectionSkeleton } from "@/components/ui/FeatureSkeletons";
import { useUser } from "@/contexts/UserContext";
import { canManageMemberStatus, hasFullAccess, hasPayrollManagementAccess } from "@/lib/role-access";
import { fetchInactiveMembers } from "@/lib/users-admin";
import { getPayBasisLabel } from "@/lib/pay-basis";
import { findScheme, getOptionLabel } from "@/lib/payroll-options";
import { applyProfileToEmployee, buildPaySummary, type PayrollProfile } from "@/lib/payroll-setup";
import { taxChoiceLabel } from "@/lib/payroll-tax";
import { matchesEmployeeSearch } from "@/lib/employee-search";
import { ALL_CATEGORIES, categoryCounts, categoryLabel, matchesCategory } from "@/lib/employee-history";
import EmployeeCard from "./EmployeeCard";
import EmployeeCategoryFilter from "./EmployeeCategoryFilter";
import EmployeeOverviewStats from "./EmployeeOverviewStats";
import EmployeeOverviewToolbar, { type EmployeeView } from "./EmployeeOverviewToolbar";
import InactiveMembersPanel from "./InactiveMembersPanel";
import PendingApplicationCard from "./PendingApplicationCard";
import PayrollSetupDialogs from "./PayrollSetupDialogs";
import { usePayrollCatalog } from "./usePayrollOptions";
import { usePayrollSetupDialogs } from "./usePayrollSetupDialogs";
import type { MemberStatusAction, MemberStatusTarget } from "./MemberStatusModal";
import type { Employee } from "@/lib/payroll-calendar/types";
import type { ApiEmployee } from "@/lib/types/api";

// Lazy-loaded modals (only rendered when opened)
const EmployeeDetailsModal = dynamic(() => import("./EmployeeDetailsModal"), { ssr: false });
const EmployeeEditModal = dynamic(() => import("./EmployeeEditModal"), { ssr: false });
const InviteEmployeeModal = dynamic(() => import("./InviteEmployeeModal"), { ssr: false });
const MemberStatusModal = dynamic(() => import("./MemberStatusModal"), { ssr: false });
const ResetPasswordModal = dynamic(() => import("./ResetPasswordModal"), { ssr: false });

interface EmployeeOverviewTabProps {
    initialView?: EmployeeView;
}

function normalizeEmployee(emp: ApiEmployee): Employee {
    return {
        ...emp,
        hoursThisWeek: emp.hoursThisWeek || 0,
        performance: typeof emp.performance === "number" ? emp.performance : null,
        salary: emp.salary || (emp.employeeProfile?.baseSalary) || 0,
        department: emp.department || (emp.employeeProfile?.department?.name) || "Operations",
        role: emp.role || (emp.employeeProfile?.jobTitle) || "Member",
        // Scheme key; a missing one resolves to the default scheme of the managed list.
        payrollScheme: emp.payrollScheme || emp.employeeProfile?.payrollScheme || null,
        maxBillableHoursPerDay: emp.maxBillableHoursPerDay || emp.employeeProfile?.maxBillableHoursPerDay || 8,
        avatar: emp.avatar || (emp.name?.[0] || "U"),
        status: (emp.status || "active") as Employee["status"],
        email: emp.email || "no-email@company.com",
    };
}

export default function EmployeeOverviewTab({ initialView = "deployed" }: EmployeeOverviewTabProps) {
    const toast = useToast();
    const showToastError = toast.error;
    const { user } = useUser();
    const canChangeStatus = canManageMemberStatus(user);
    const canManagePayroll = hasPayrollManagementAccess(user);
    // Nobody deactivates their own account from this list (they would lock themselves out).
    const isCurrentUser = (memberId: string | number) => user?.id != null && String(memberId) === String(user.id);
    const isAdmin = hasFullAccess(user);
    const queryClient = useQueryClient();
    const catalog = usePayrollCatalog();
    const dialogs = usePayrollSetupDialogs();
    const [view, setView] = useState<EmployeeView>(initialView);
    const [query, setQuery] = useState("");
    // Employment type filter for the deployed list (2026-10-28).
    const [category, setCategory] = useState(ALL_CATEGORIES);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [statusAction, setStatusAction] = useState<{ action: MemberStatusAction; member: MemberStatusTarget } | null>(null);
    const [passwordResetMember, setPasswordResetMember] = useState<MemberStatusTarget | null>(null);
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [deployedRes, pendingRes] = await Promise.all([apiFetch("/employees/deployed"), apiFetch("/employees/pending")]);
            const [deployedData, pendingData] = await Promise.all([deployedRes.json(), pendingRes.json()]);
            if (!Array.isArray(deployedData) || !Array.isArray(pendingData)) {
                throw new Error("Invalid data format from server");
            }
            setEmployees(deployedData.map(normalizeEmployee));
            setPendingEmployees(pendingData.map(normalizeEmployee));
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

    const openDetails = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowDetailsModal(true);
    };

    const openEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowEditModal(true);
    };

    const patchEmployee = (employeeId: string | number, update: (employee: Employee) => Employee) => {
        const id = String(employeeId);
        setEmployees((prev) => prev.map((emp) => (String(emp.id) === id ? update(emp) : emp)));
        setPendingEmployees((prev) => prev.map((emp) => (String(emp.id) === id ? update(emp) : emp)));
    };

    // Throws on failure: EmployeeEditModal shows the message inline and stays open.
    // apiFetch throws the server's message on any non-2xx answer.
    const handleSaveEmployee = async (employeeId: string | number, updates: Partial<Employee>) => {
        try {
            await apiFetch(`/users/${employeeId}`, {
                method: "PATCH",
                body: JSON.stringify(updates),
            });
            patchEmployee(employeeId, (emp) => ({ ...emp, ...updates }));
            // The edit can change salary, scheme or cap: views reading the profile refetch it.
            void queryClient.invalidateQueries({ queryKey: PAYROLL_PROFILE_QUERY_KEY });
            toast.success("Employee updated successfully");
        } catch (err) {
            console.error("Update failed", err);
            throw err instanceof Error ? err : new Error("Failed to update employee");
        }
    };

    // Set Up Payroll answers with the saved profile; the card updates without a refetch.
    const handlePayrollSaved = (employeeId: string, profile: PayrollProfile) => {
        patchEmployee(employeeId, (emp) => applyProfileToEmployee(emp, profile));
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
            const res = await apiFetch(`/employees/approve/${employee.id}`, { method: "POST" });
            const data: { onboarding?: { emailSent?: boolean; setupUrl?: string } } = await res.json().catch(() => ({}));
            // The API hands the setup link back only when the setup email was not sent
            // (email not configured or delivery failed). Surface it instead of dropping it.
            const setupUrl = data.onboarding?.emailSent === false ? data.onboarding.setupUrl : undefined;

            if (setupUrl) {
                const copied = await navigator.clipboard?.writeText(setupUrl).then(() => true, () => false);
                toast.showToast(
                    "warning",
                    `${employee.name} approved, but no setup email was sent (email is not configured).`,
                    `${copied ? "Setup link copied to clipboard. " : ""}Send this link to the employee yourself: ${setupUrl}`,
                    30000,
                );
            } else {
                toast.success(`${employee.name} has been approved and deployed. A setup email was sent.`);
            }
            fetchData();
        } catch (err) {
            console.error("Approval failed", err);
            toast.error(err instanceof Error ? err.message : "Failed to approve employee");
        }
    };

    const handleRejectEmployee = async (employee: Employee) => {
        try {
            await apiFetch(`/employees/reject/${employee.id}`, { method: "POST" });
            toast.info(`Application for ${employee.name} has been rejected`);
            fetchData();
        } catch (err) {
            console.error("Rejection failed", err);
            toast.error("Failed to reject employee");
        }
    };

    const paySummaryFor = (employee: Employee) => buildPaySummary({
        payBasisLabel: getPayBasisLabel(employee.payBasis),
        schemeName: findScheme(catalog.schemes, employee.payrollScheme)?.name,
        capHours: employee.maxBillableHoursPerDay,
        frequencyLabel: getOptionLabel(catalog.paymentFrequencies, employee.paymentFrequency),
        // Shown only when the person is not on the workspace default tax rule.
        taxLabel: taxChoiceLabel(catalog.taxRules, employee.taxRule),
    });

    // Category chips: every employment type from Payroll options, with counts (2026-10-28).
    const categoryChips = categoryCounts(employees.map((emp) => emp.employmentType), catalog.employmentTypes);
    const selectedCategory = category === ALL_CATEGORIES ? null : categoryChips.find((chip) => chip.value === category)?.label ?? "this category";
    const shownDeployed = employees.filter((emp) => matchesEmployeeSearch(emp, query) && matchesCategory(emp.employmentType, category));
    const shownPending = pendingEmployees.filter((emp) => matchesEmployeeSearch(emp, query));
    const shownInactive = inactiveMembers.filter((member) => matchesEmployeeSearch(member, query));

    const noMatches = (
        <div className="col-span-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] py-10 text-center">
            <p className="text-sm text-[var(--muted)]">No one matches &quot;{query.trim()}&quot;.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setQuery("")}>Clear search</Button>
        </div>
    );

    const noDeployedMatches = !selectedCategory ? noMatches : (
        <div className="col-span-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
                {query.trim() ? <>No one in {selectedCategory} matches &quot;{query.trim()}&quot;.</> : <>No employees in {selectedCategory}.</>}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setQuery(""); setCategory(ALL_CATEGORIES); }}>Clear filters</Button>
        </div>
    );

    return (
        <div className="space-y-6">
            <EmployeeOverviewToolbar
                view={view}
                onViewChange={setView}
                pendingCount={pendingEmployees.length}
                showInactive={canChangeStatus}
                onOpenPayrollOptions={canManagePayroll ? dialogs.openManager : undefined}
                onAddEmployee={isAdmin ? () => setShowInviteModal(true) : undefined}
                query={query}
                onQueryChange={setQuery}
                filters={view === "deployed" && employees.length > 0 ? (
                    <EmployeeCategoryFilter counts={categoryChips} total={employees.length} value={category} onChange={setCategory} />
                ) : undefined}
            />

            {isLoading && employees.length === 0 ? (
                <PayrollEmployeesSectionSkeleton />
            ) : view === "inactive" ? null : (
                <EmployeeOverviewStats view={view} employees={employees} pendingEmployees={pendingEmployees} />
            )}

            {view === "inactive" && (
                <InactiveMembersPanel
                    members={shownInactive}
                    loading={inactiveLoading}
                    error={inactiveError}
                    canHardDelete={isAdmin}
                    onRetry={() => void loadInactiveMembers()}
                    onReactivate={(member) => setStatusAction({ action: "reactivate", member })}
                    onHardDelete={(member) => setStatusAction({ action: "hard_delete", member })}
                />
            )}

            {!isLoading && view === "deployed" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {shownDeployed.map((employee) => (
                        <EmployeeCard
                            key={employee.id}
                            employee={employee}
                            paySummary={paySummaryFor(employee)}
                            categoryLabel={categoryLabel(catalog.employmentTypes, employee.employmentType)}
                            onViewDetails={() => openDetails(employee)}
                            onEdit={() => openEdit(employee)}
                            onSetUpPayroll={canManagePayroll ? () => dialogs.openSetup(employee) : undefined}
                            onDeactivate={canChangeStatus && !isCurrentUser(employee.id)
                                ? () => setStatusAction({ action: "deactivate", member: toStatusTarget(employee) })
                                : undefined}
                            onResetPassword={canChangeStatus && !isCurrentUser(employee.id)
                                ? () => setPasswordResetMember(toStatusTarget(employee))
                                : undefined}
                        />
                    ))}
                    {employees.length === 0 && (
                        <div className="col-span-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] py-12 text-center">
                            <p className="text-[var(--muted)]">No deployed employees yet. Approve an application or add an employee.</p>
                        </div>
                    )}
                    {employees.length > 0 && shownDeployed.length === 0 && noDeployedMatches}
                </div>
            )}

            {!isLoading && view === "pending" && (
                pendingEmployees.length === 0 ? (
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] py-12 text-center">
                        <UserPlus className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]" aria-hidden="true" />
                        <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">No Pending Applications</h3>
                        <p className="text-sm text-[var(--muted)]">All employee applications have been processed</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {shownPending.map((employee) => (
                            <PendingApplicationCard
                                key={employee.id}
                                employee={employee}
                                onEdit={() => openEdit(employee)}
                                onApprove={() => handleApproveEmployee(employee)}
                                onReject={() => handleRejectEmployee(employee)}
                            />
                        ))}
                        {shownPending.length === 0 && noMatches}
                    </div>
                )
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

            {passwordResetMember && (
                <ResetPasswordModal member={passwordResetMember} onClose={() => setPasswordResetMember(null)} />
            )}

            <PayrollSetupDialogs dialogs={dialogs} canManageOptions={canManagePayroll} onSaved={handlePayrollSaved} />
        </div>
    );
}
