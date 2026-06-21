import { apiFetch } from './api';

export interface PendingEmployee {
  id: string;
  name?: string | null;
  email: string;
  status?: string | null;
  appliedDate?: string | null;
}

export async function fetchPendingEmployees(): Promise<PendingEmployee[]> {
  const res = await apiFetch('/employees/pending');
  if (!res.ok) {
    throw new Error('Failed to fetch pending employees');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
