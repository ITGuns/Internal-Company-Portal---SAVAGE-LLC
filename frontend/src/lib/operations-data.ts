import { apiFetch } from './api';
import type { User } from './users';

export type OperationsDepartment = {
  id: string;
  name: string;
  driveId?: string;
  description?: string;
  _count?: {
    tasks?: number;
    roles?: number;
  };
};

export type OperationsRole = {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
};

export const OPERATIONS_QUERY_KEYS = {
  root: ['operations'] as const,
  departments: ['operations', 'departments'] as const,
  roles: ['operations', 'roles'] as const,
  members: ['operations', 'members'] as const,
};

export const OPERATIONS_CORE_STALE_MS = 10 * 60 * 1000;
export const OPERATIONS_MEMBERS_STALE_MS = 10 * 60 * 1000;
export const OPERATIONS_CACHE_GC_MS = 30 * 60 * 1000;

async function readJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const body = await response.json();
      if (typeof (body as { error?: unknown })?.error === 'string') {
        message = (body as { error: string }).error;
      }
    } catch {
      // Keep the caller-facing fallback when the response body is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function fetchOperationsDepartments(): Promise<OperationsDepartment[]> {
  const response = await apiFetch('/departments');
  return readJsonOrThrow<OperationsDepartment[]>(response, 'Failed to load departments');
}

export async function fetchOperationsRoles(): Promise<OperationsRole[]> {
  const response = await apiFetch('/roles');
  return readJsonOrThrow<OperationsRole[]>(response, 'Failed to load roles');
}

export async function fetchOperationsMembers(): Promise<User[]> {
  const response = await apiFetch('/users');
  return readJsonOrThrow<User[]>(response, 'Failed to load members');
}

export async function syncOperationsOrgCatalog(): Promise<void> {
  const response = await apiFetch('/departments/org-catalog/sync', { method: 'POST' });
  await readJsonOrThrow(response, 'Failed to sync org chart');
}
