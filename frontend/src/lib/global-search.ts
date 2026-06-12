import { apiFetch } from './api';

export type GlobalSearchResultType =
  | 'task'
  | 'daily-log'
  | 'announcement'
  | 'person'
  | 'message'
  | 'file'
  | 'client'
  | 'client-project'
  | 'client-ticket'
  | 'client-work'
  | 'client-approval'
  | 'client-report'
  | 'client-resource'
  | 'client-asset'
  | 'client-calendar'
  | 'client-roadmap'
  | 'client-update'
  | 'client-activity'
  | 'payroll-event'
  | 'payroll-time'
  | 'payroll-payslip'
  | 'payroll-profile';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  section: string;
}

export async function searchGlobal(query: string): Promise<GlobalSearchResult[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  const response = await apiFetch(`/search?q=${encodeURIComponent(normalized)}`);
  return response.json();
}
