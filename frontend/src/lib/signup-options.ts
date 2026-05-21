export interface SignupRoleOption {
  id: string;
  name: string;
  departmentId?: string | null;
}

export interface SignupDepartmentOption {
  id: string;
  name: string;
  availableRoles?: SignupRoleOption[];
}

export function getSignupRoleOptions(
  departments: SignupDepartmentOption[],
  departmentId: string,
): SignupRoleOption[] {
  if (!departmentId) return [];

  const selectedDepartment = departments.find(
    (department) => String(department.id) === String(departmentId),
  );

  return selectedDepartment?.availableRoles || [];
}
