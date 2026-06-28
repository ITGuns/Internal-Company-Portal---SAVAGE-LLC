import { DEPARTMENTS, DEPARTMENT_ROLES } from "@/lib/departments";
import type { OperationsDepartment } from "@/lib/operations-data";

export type EmployeeRoleCatalogDepartment = {
  id: string;
  name: string;
  roles: string[];
  source: "live" | "fallback";
};

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function buildFallbackCatalog(): EmployeeRoleCatalogDepartment[] {
  return DEPARTMENTS
    .filter((department) => department !== "All Departments")
    .map((department) => ({
      id: `fallback:${department}`,
      name: department,
      roles: uniqueNonEmpty(DEPARTMENT_ROLES[department] || []),
      source: "fallback" as const,
    }));
}

export function buildEmployeeRoleCatalog(
  departments?: OperationsDepartment[] | null,
): EmployeeRoleCatalogDepartment[] {
  const liveDepartments = Array.isArray(departments)
    ? departments
      .filter((department) => department.name?.trim() && department.name !== "All Departments")
      .map((department) => ({
        id: department.id,
        name: department.name.trim(),
        roles: uniqueNonEmpty((department.availableRoles || []).map((role) => role.name)),
        source: "live" as const,
      }))
    : [];

  return liveDepartments.length > 0 ? liveDepartments : buildFallbackCatalog();
}

export function getEmployeeDepartmentNames(catalog: EmployeeRoleCatalogDepartment[]): string[] {
  return catalog.map((department) => department.name);
}

export function getEmployeeRolesForDepartment(
  catalog: EmployeeRoleCatalogDepartment[],
  departmentName: string,
): string[] {
  const normalizedName = departmentName.trim().toLowerCase();
  return catalog.find((department) => department.name.toLowerCase() === normalizedName)?.roles || [];
}

