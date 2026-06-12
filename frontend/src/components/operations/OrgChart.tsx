"use client";

import React, { useState, useMemo } from "react";
import { 
  Building, 
  Briefcase, 
  Users, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  UserCheck, 
  UserMinus,
} from "lucide-react";
import type { OperationsDepartment, OperationsRole } from "@/lib/operations-data";
import type { OperationsMember } from "@/lib/member-role-management";
import { getMemberDisplayName, getMemberAuthorizationLabels } from "@/lib/member-role-management";

interface OrgChartProps {
  departments: OperationsDepartment[];
  roles: OperationsRole[];
  members: OperationsMember[];
}

export default function OrgChart({ departments, roles, members }: OrgChartProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedAuth, setSelectedAuth] = useState<string>("all");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  // Toggle department expansion
  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Group members by department & role
  // A member can have multiple role assignments
  const memberAssignments = useMemo(() => {
    const list: { member: OperationsMember; roleName: string; departmentId: string | null }[] = [];
    members.forEach(member => {
      if (member.roles && member.roles.length > 0) {
        member.roles.forEach(assignment => {
          list.push({
            member,
            roleName: assignment.role,
            departmentId: assignment.departmentId || null
          });
        });
      } else {
        // No explicit role assigned
        list.push({
          member,
          roleName: "Unassigned Role",
          departmentId: null
        });
      }
    });
    return list;
  }, [members]);

  // Statistics
  const stats = useMemo(() => {
    const totalDepts = departments.length;
    const totalRoles = roles.length;
    const totalMembers = members.length;
    const activeStaff = members.filter(m => m.isApproved).length;
    const unassignedCount = members.filter(m => !m.roles || m.roles.length === 0).length;

    return {
      totalDepts,
      totalRoles,
      totalMembers,
      activeStaff,
      unassignedCount
    };
  }, [departments, roles, members]);

  // Filter departments, roles, and member nodes based on search/filters
  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Find all assignments matching query and filters
    const matchedAssignments = memberAssignments.filter(assign => {
      // 1. Search Query
      const nameMatch = getMemberDisplayName(assign.member).toLowerCase().includes(normalizedQuery);
      const emailMatch = assign.member.email.toLowerCase().includes(normalizedQuery);
      const roleMatch = assign.roleName.toLowerCase().includes(normalizedQuery);
      
      const dept = departments.find(d => d.id === assign.departmentId);
      const deptMatch = dept ? dept.name.toLowerCase().includes(normalizedQuery) : false;

      const matchesSearch = !normalizedQuery || nameMatch || emailMatch || roleMatch || deptMatch;

      // 2. Department filter
      const matchesDept = selectedDeptId === "all" || assign.departmentId === selectedDeptId;

      // 3. Authorization filter
      const authLabels = getMemberAuthorizationLabels(assign.member);
      const matchesAuth = selectedAuth === "all" || authLabels.includes(selectedAuth);

      return matchesSearch && matchesDept && matchesAuth;
    });

    // Extract active departments that are either matches or contain matches
    const activeDeptIds = new Set<string>();
    matchedAssignments.forEach(assign => {
      if (assign.departmentId) activeDeptIds.add(assign.departmentId);
    });

    // If query matches department name directly, include all roles/members of that department
    if (normalizedQuery) {
      departments.forEach(d => {
        if (d.name.toLowerCase().includes(normalizedQuery)) {
          activeDeptIds.add(d.id);
          // Add all assignments of this department to matched if not already present
          memberAssignments.forEach(assign => {
            if (assign.departmentId === d.id && !matchedAssignments.includes(assign)) {
              matchedAssignments.push(assign);
            }
          });
        }
      });
    }

    return {
      assignments: matchedAssignments,
      activeDeptIds
    };
  }, [searchQuery, selectedDeptId, selectedAuth, memberAssignments, departments]);

  // Color mapping utility for department badges/borders
  const getDeptColorClasses = (deptName: string) => {
    const name = deptName.toLowerCase();
    if (name.includes("operations") || name.includes("ops")) {
      return {
        border: "border-[#17d9f5]/30",
        bg: "bg-[#17d9f5]/5",
        text: "text-[#17d9f5]",
        accent: "#17d9f5"
      };
    }
    if (name.includes("creative") || name.includes("marketing") || name.includes("design")) {
      return {
        border: "border-[#f23bbf]/30",
        bg: "bg-[#f23bbf]/5",
        text: "text-[#f23bbf]",
        accent: "#f23bbf"
      };
    }
    if (name.includes("finance") || name.includes("accounting") || name.includes("billing")) {
      return {
        border: "border-[#2ee59d]/30",
        bg: "bg-[#2ee59d]/5",
        text: "text-[#2ee59d]",
        accent: "#2ee59d"
      };
    }
    if (name.includes("engineering") || name.includes("tech") || name.includes("dev")) {
      return {
        border: "border-[#f6c95c]/30",
        bg: "bg-[#f6c95c]/5",
        text: "text-[#f6c95c]",
        accent: "#f6c95c"
      };
    }
    // Default fallback
    return {
      border: "border-[var(--border)]",
      bg: "bg-[var(--card-surface)]",
      text: "text-[var(--accent)]",
      accent: "var(--accent)"
    };
  };

  // Unique list of auth roles present in the workspace
  const allAuthOptions = ["Full access", "Management", "Payroll", "Client ops", "Client portal"];

  // Initialize all departments to expanded if not set
  const isDeptExpanded = (deptId: string) => {
    return expandedDepts[deptId] !== false; // defaults to true
  };

  return (
    <div className="space-y-6">
      {/* ── Stats Dashboard Grid ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Departments", value: stats.totalDepts, icon: <Building className="w-5 h-5 text-[#17d9f5]" />, color: "from-[#17d9f5]/20 to-transparent" },
          { label: "Unique Roles", value: stats.totalRoles, icon: <Briefcase className="w-5 h-5 text-[#f23bbf]" />, color: "from-[#f23bbf]/20 to-transparent" },
          { label: "Active Staff", value: stats.activeStaff, icon: <UserCheck className="w-5 h-5 text-[#2ee59d]" />, color: "from-[#2ee59d]/20 to-transparent" },
          { label: "Unassigned", value: stats.unassignedCount, icon: <UserMinus className="w-5 h-5 text-[#f6c95c]" />, color: "from-[#f6c95c]/20 to-transparent" }
        ].map((stat, idx) => (
          <div 
            key={idx} 
            className={`relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm hover:shadow-md transition-all duration-300 group`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{stat.label}</p>
                <h4 className="mt-2 text-2xl font-bold font-mono tracking-tight text-[var(--foreground)]">{stat.value}</h4>
              </div>
              <div className="p-2 rounded-lg bg-[var(--card-surface)] border border-[var(--border)] group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>
            </div>
            <div className={`absolute inset-0 bg-gradient-to-tr ${stat.color} opacity-10 pointer-events-none`} />
          </div>
        ))}
      </div>

      {/* ── Filters & Search Toolbar ────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search member, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#17d9f5] focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dept-filter" className="text-xs text-[var(--muted)] font-semibold">Department:</label>
            <select
              id="dept-filter"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-[var(--card-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="auth-filter" className="text-xs text-[var(--muted)] font-semibold">Authorization:</label>
            <select
              id="auth-filter"
              value={selectedAuth}
              onChange={(e) => setSelectedAuth(e.target.value)}
              className="bg-[var(--card-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
            >
              <option value="all">All Access</option>
              {allAuthOptions.map(auth => (
                <option key={auth} value={auth}>{auth}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Organizational Chart Visualization ──────────────── */}
      <div className="space-y-6">
        
        {/* Render Departments */}
        {departments
          .filter(d => selectedDeptId === "all" || d.id === selectedDeptId)
          .filter(d => filteredData.activeDeptIds.has(d.id) || !searchQuery)
          .map(dept => {
            const colors = getDeptColorClasses(dept.name);
            const deptRoles = roles.filter(r => r.departmentId === dept.id);
            const expanded = isDeptExpanded(dept.id);

            return (
              <div 
                key={dept.id} 
                className={`rounded-xl border ${colors.border} bg-[var(--card-bg)] overflow-hidden shadow-sm transition-all duration-300`}
              >
                {/* Department Header Node */}
                <div 
                  onClick={() => toggleDept(dept.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--card-surface)] select-none transition-colors border-b border-[var(--border)]`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--foreground)]">{dept.name}</h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {dept.description || "Official Department Node"} · {deptRoles.length} roles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                      Active Nodes
                    </span>
                    <button className="p-1 hover:bg-[var(--background)] rounded-full transition-colors">
                      {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Roles & Member Tree */}
                {expanded && (
                  <div className="p-6 bg-gradient-to-b from-[var(--card-bg)] to-[var(--background)] space-y-6 relative">
                    
                    {/* Visual Connector Line */}
                    <div className="absolute left-10 top-0 bottom-12 w-0.5 border-l-2 border-dashed border-[var(--border)] pointer-events-none" />

                    {deptRoles.length === 0 ? (
                      <div className="pl-12 py-4 text-xs text-[var(--muted)] italic">
                        No roles added to this department yet.
                      </div>
                    ) : (
                      deptRoles.map(role => {
                        const roleAssignments = filteredData.assignments.filter(
                          assign => assign.departmentId === dept.id && assign.roleName === role.name
                        );

                        if (searchQuery && roleAssignments.length === 0) return null;

                        return (
                          <div key={role.id} className="relative pl-12 group/role">
                            
                            {/* Branch connector */}
                            <div className="absolute left-10 top-5 w-6 border-t-2 border-dashed border-[var(--border)] pointer-events-none" />

                            <div className="flex flex-col space-y-3">
                              {/* Role Node */}
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#17d9f5] ring-4 ring-[#17d9f5]/15" />
                                <h4 className="text-sm font-bold text-[var(--foreground)] tracking-wide">
                                  {role.name}
                                </h4>
                                <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--card-surface)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                                  {roleAssignments.length} Staff
                                </span>
                              </div>

                              {/* Members in Role Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-4">
                                {roleAssignments.length === 0 ? (
                                  <div className="text-xs text-[var(--muted)] italic py-1 col-span-full">
                                    No staff currently assigned to this role.
                                  </div>
                                ) : (
                                  roleAssignments.map(({ member }) => {
                                    const name = getMemberDisplayName(member);
                                    const initials = name
                                      .split(" ")
                                      .map(n => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2);
                                    
                                    const authLabels = getMemberAuthorizationLabels(member);

                                    return (
                                      <div 
                                        key={member.id}
                                        className="relative p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#17d9f5]/50 hover:shadow-md transition-all duration-300 flex items-start gap-3 group/member"
                                      >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#17d9f5]/25 to-[#f23bbf]/25 border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--foreground)] flex-shrink-0 group-hover/member:scale-105 transition-transform duration-300">
                                          {initials}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 justify-between">
                                            <span className="font-bold text-xs text-[var(--foreground)] truncate block">
                                              {name}
                                            </span>
                                            {member.isApproved && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-[#2ee59d]" title="Active Account" />
                                            )}
                                          </div>
                                          <span className="text-[10px] text-[var(--muted)] truncate block mt-0.5">
                                            {member.email}
                                          </span>

                                          {/* Access labels */}
                                          <div className="flex flex-wrap gap-1 mt-2.5">
                                            {authLabels.map(label => (
                                              <span 
                                                key={label}
                                                className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--card-surface)] border border-[var(--border)] px-1 py-0.5 rounded text-[var(--muted)]"
                                              >
                                                <Shield className="w-2 h-2 text-[#17d9f5]" />
                                                {label}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* ── Render Unassigned / General Executive Node ────────── */}
        {filteredData.assignments.some(a => !a.departmentId) && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-sm">
            <div className="p-4 bg-[var(--card-surface)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[var(--border)] text-[var(--muted)] border border-[var(--border)]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)]">General & Executive Operations</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Workspace members without specific department assignments
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredData.assignments
                .filter(a => !a.departmentId)
                .map(({ member, roleName }) => {
                  const name = getMemberDisplayName(member);
                  const initials = name
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  
                  const authLabels = getMemberAuthorizationLabels(member);

                  return (
                    <div 
                      key={member.id}
                      className="p-3.5 rounded-xl bg-[var(--card-surface)] border border-[var(--border)] hover:border-[#f23bbf]/50 hover:shadow-md transition-all duration-300 flex items-start gap-3"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f6c95c]/25 to-[#f23bbf]/25 border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--foreground)] flex-shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-[var(--foreground)] truncate block">
                          {name}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] truncate block mt-0.5">
                          {member.email}
                        </span>
                        <span className="text-[9px] font-bold text-[#f23bbf] uppercase tracking-wider mt-1 block">
                          {roleName}
                        </span>

                        {/* Access labels */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {authLabels.map(label => (
                            <span 
                              key={label}
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--card-bg)] border border-[var(--border)] px-1 py-0.5 rounded text-[var(--muted)]"
                            >
                              <Shield className="w-2 h-2 text-[#f23bbf]" />
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────── */}
        {filteredData.assignments.length === 0 && (
          <div className="text-center py-12 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
            <Users className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-60" />
            <h4 className="font-bold text-sm text-[var(--foreground)]">No matching members found</h4>
            <p className="text-xs text-[var(--muted)] mt-1">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
