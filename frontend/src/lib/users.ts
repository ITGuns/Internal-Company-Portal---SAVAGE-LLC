
import { apiFetch } from './api';
import { buildMemberRoleRemovalEndpoint, type MemberRoleAssignment } from './member-role-management';
import type { PaginatedResponse } from './types/pagination';

export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    status?: string;
    isApproved?: boolean;
    createdAt: string;
    updatedAt: string;
    roles?: MemberRoleAssignment[];
    employeeProfile?: {
        jobTitle?: string | null;
        employmentType?: string | null;
    } | null;
}

export const fetchUsers = async (): Promise<User[]> => {
    const res = await apiFetch('/users');
    return res.json();
};

export const fetchUsersPaginated = async (page: number, limit: number): Promise<PaginatedResponse<User>> => {
    const res = await apiFetch(`/users?page=${page}&limit=${limit}`);
    return res.json();
};

export const searchUsers = async (query: string): Promise<User[]> => {
    const res = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
    return res.json();
};

export const fetchUserById = async (id: string): Promise<User> => {
    const res = await apiFetch(`/users/${id}`);
    return res.json();
};

export const assignUserRole = async (
    userId: string,
    roleData: { role: string; departmentId?: string },
): Promise<void> => {
    await apiFetch(`/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify(roleData),
    });
};

export const removeUserRole = async (
    userId: string,
    assignment: Pick<MemberRoleAssignment, 'role' | 'departmentId'>,
): Promise<void> => {
    await apiFetch(buildMemberRoleRemovalEndpoint(userId, assignment), {
        method: 'DELETE',
    });
};
