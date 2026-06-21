export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';

export interface NotificationPreferences {
  browserAlerts: boolean;
  mutedTypes: NotificationType[];
}

export interface NotificationPreferencePatch {
  browserAlerts?: boolean;
  mutedTypes?: NotificationType[];
}

export interface NotificationPreferencePayload {
  type: NotificationType;
  title: string;
  message: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type NotificationTarget = {
  Notification?: typeof Notification;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browserAlerts: false,
  mutedTypes: [],
};

function getDefaultNotificationTarget(): NotificationTarget | undefined {
  if (typeof window === 'undefined') return undefined;
  return window;
}

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value as NotificationType);
}

export function getNotificationPreferencesStorageKey(userId?: string | number | null) {
  return `notification_preferences:${userId ? String(userId) : 'anonymous'}`;
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const source = typeof value === 'object' && value !== null
    ? value as Partial<NotificationPreferences>
    : {};

  const mutedTypes = Array.isArray(source.mutedTypes)
    ? Array.from(new Set(source.mutedTypes.filter(isNotificationType)))
    : [];

  return {
    browserAlerts: source.browserAlerts === true,
    mutedTypes,
  };
}

export function updateNotificationPreferences(
  current: unknown,
  patch: NotificationPreferencePatch,
): NotificationPreferences {
  const normalizedCurrent = normalizeNotificationPreferences(current);

  return normalizeNotificationPreferences({
    browserAlerts: typeof patch.browserAlerts === 'boolean'
      ? patch.browserAlerts
      : normalizedCurrent.browserAlerts,
    mutedTypes: Array.isArray(patch.mutedTypes)
      ? patch.mutedTypes
      : normalizedCurrent.mutedTypes,
  });
}

export function readNotificationPreferences(
  userId?: string | number | null,
  storage: StorageLike | undefined = getDefaultStorage(),
): NotificationPreferences {
  if (!storage) return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    const raw = storage.getItem(getNotificationPreferencesStorageKey(userId));
    return normalizeNotificationPreferences(raw ? JSON.parse(raw) : undefined);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function writeNotificationPreferences(
  userId: string | number | null | undefined,
  preferences: NotificationPreferences,
  storage: StorageLike | undefined = getDefaultStorage(),
) {
  if (!storage) return;

  try {
    storage.setItem(
      getNotificationPreferencesStorageKey(userId),
      JSON.stringify(normalizeNotificationPreferences(preferences)),
    );
  } catch {
    // Preference writes are best-effort; notification delivery still works without persistence.
  }
}

export function shouldShowNotification(
  notification: Pick<NotificationPreferencePayload, 'type'>,
  preferences: NotificationPreferences,
) {
  return !preferences.mutedTypes.includes(notification.type);
}

export function getBrowserNotificationPermission(
  target: NotificationTarget | undefined = getDefaultNotificationTarget(),
): BrowserNotificationPermissionState {
  if (!target?.Notification) return 'unsupported';
  return target.Notification.permission;
}

export async function requestBrowserNotificationPermission(
  target: NotificationTarget | undefined = getDefaultNotificationTarget(),
): Promise<BrowserNotificationPermissionState> {
  if (!target?.Notification) return 'unsupported';

  const notificationApi = target.Notification;
  if (notificationApi.permission === 'granted' || notificationApi.permission === 'denied') {
    return notificationApi.permission;
  }

  if (typeof notificationApi.requestPermission !== 'function') {
    return notificationApi.permission;
  }

  try {
    return await notificationApi.requestPermission();
  } catch {
    return notificationApi.permission;
  }
}

export function createBrowserNotification(
  notification: NotificationPreferencePayload,
  target: NotificationTarget | undefined = getDefaultNotificationTarget(),
) {
  if (!target?.Notification || target.Notification.permission !== 'granted') {
    return false;
  }

  try {
    new target.Notification(notification.title, {
      body: notification.message,
      tag: `${notification.type}:${notification.title}`,
    });
    return true;
  } catch {
    return false;
  }
}
