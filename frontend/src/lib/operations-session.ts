export const OPERATIONS_TABS = ['departments', 'roles', 'members', 'clients'] as const;

export type OperationsTab = (typeof OPERATIONS_TABS)[number];

const OPERATIONS_ACTIVE_TAB_KEY = 'mydeskii.operations.activeTab';
const OPERATIONS_ORG_SYNC_KEY = 'mydeskii.operations.orgCatalogSynced';
const OPERATIONS_ORG_SYNC_TTL_MS = 30 * 60 * 1000;

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getSessionStorage(): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isOperationsTab(value: unknown): value is OperationsTab {
  return typeof value === 'string' && OPERATIONS_TABS.includes(value as OperationsTab);
}

export function getInitialOperationsTab(storage: BrowserStorage | null = getSessionStorage()): OperationsTab {
  if (!storage) return 'departments';
  try {
    const cachedTab = storage.getItem(OPERATIONS_ACTIVE_TAB_KEY);
    return isOperationsTab(cachedTab) ? cachedTab : 'departments';
  } catch {
    return 'departments';
  }
}

export function cacheOperationsTab(tab: OperationsTab, storage: BrowserStorage | null = getSessionStorage()) {
  if (!storage) return;
  try {
    storage.setItem(OPERATIONS_ACTIVE_TAB_KEY, tab);
  } catch {
    // Session cache is best-effort; navigation must still work if storage is unavailable.
  }
}

export function shouldAutoSyncOperationsOrgCatalog(
  userId: string,
  canManageOrgSettings: boolean,
  now = Date.now(),
  storage: BrowserStorage | null = getSessionStorage(),
): boolean {
  if (!userId || !canManageOrgSettings || !storage) return false;

  try {
    const raw = storage.getItem(OPERATIONS_ORG_SYNC_KEY);
    if (!raw) return true;
    const cached = JSON.parse(raw) as { userId?: unknown; syncedAt?: unknown };
    if (cached.userId !== userId || typeof cached.syncedAt !== 'number') return true;
    return now - cached.syncedAt > OPERATIONS_ORG_SYNC_TTL_MS;
  } catch {
    return true;
  }
}

export function markOperationsOrgCatalogSynced(
  userId: string,
  now = Date.now(),
  storage: BrowserStorage | null = getSessionStorage(),
) {
  if (!userId || !storage) return;
  try {
    storage.setItem(OPERATIONS_ORG_SYNC_KEY, JSON.stringify({ userId, syncedAt: now }));
  } catch {
    // Session cache is best-effort; failed writes should not block the sync result.
  }
}
