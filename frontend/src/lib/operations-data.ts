import { apiFetch } from './api';
import type { User } from './users';

export type OperationsDepartment = {
  id: string;
  name: string;
  driveId?: string;
  description?: string;
  availableRoles?: OperationsRole[];
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
const OPERATIONS_DEPARTMENTS_STORAGE_KEY = 'mydeskii.operations.departments';

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

type CachedOperationsDepartments = {
  departments: OperationsDepartment[];
  cachedAt: number;
};

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getSessionStorage(): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCachedOperationsDepartments(
  now = Date.now(),
  storage: BrowserStorage | null = getSessionStorage(),
): CachedOperationsDepartments | undefined {
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(OPERATIONS_DEPARTMENTS_STORAGE_KEY);
    if (!raw) return undefined;

    const cached = JSON.parse(raw) as Partial<CachedOperationsDepartments>;
    if (!Array.isArray(cached.departments) || typeof cached.cachedAt !== 'number') {
      storage.removeItem(OPERATIONS_DEPARTMENTS_STORAGE_KEY);
      return undefined;
    }

    if (now - cached.cachedAt > OPERATIONS_CACHE_GC_MS) {
      storage.removeItem(OPERATIONS_DEPARTMENTS_STORAGE_KEY);
      return undefined;
    }

    return {
      departments: cached.departments,
      cachedAt: cached.cachedAt,
    };
  } catch {
    return undefined;
  }
}

export function cacheOperationsDepartments(
  departments: OperationsDepartment[],
  now = Date.now(),
  storage: BrowserStorage | null = getSessionStorage(),
) {
  if (!storage) return;

  try {
    storage.setItem(OPERATIONS_DEPARTMENTS_STORAGE_KEY, JSON.stringify({ departments, cachedAt: now }));
  } catch {
    // Session cache is best-effort; React Query still owns the live data.
  }
}

export function deriveOperationsRolesFromDepartments(departments: OperationsDepartment[]): OperationsRole[] {
  return departments
    .flatMap((department) =>
      (department.availableRoles || []).map((role) => ({
        id: role.id,
        name: role.name,
        departmentId: role.departmentId ?? department.id,
        department: role.department || { id: department.id, name: department.name },
      })),
    )
    .sort((left, right) =>
      (left.department?.name || '').localeCompare(right.department?.name || '') ||
      left.name.localeCompare(right.name),
    );
}

export async function fetchOperationsDepartments(): Promise<OperationsDepartment[]> {
  const response = await apiFetch('/departments');
  const departments = await readJsonOrThrow<OperationsDepartment[]>(response, 'Failed to load departments');
  cacheOperationsDepartments(departments);
  return departments;
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
