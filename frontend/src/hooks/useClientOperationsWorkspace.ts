"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import {
  fetchClientActionQueue,
  fetchClientActivity,
  type ClientActionQueueItem,
  type ClientActivity,
} from "@/lib/client-activity";
import {
  ClientMembership,
  ClientOrganization,
  ClientPortalOverview,
  fetchClientMemberships,
  fetchClientOrganizations,
  fetchClientOverview,
} from "@/lib/client-portal";
import { getDefaultClientOrganizationId } from "@/lib/client-organization-history";
import { buildClientPortalSummary } from "@/lib/client-portal-summary";
import { hasClientOperationsAccess } from "@/lib/role-access";
import { AUTH_SESSION_CLEARED_EVENT } from "@/lib/auth-session";
import { fetchUsers, User } from "@/lib/users";

export interface ClientOperationsWorkspace {
  user: ReturnType<typeof useUser>["user"];
  userLoading: boolean;
  canManageClients: boolean;
  organizations: ClientOrganization[];
  selectedId: string;
  selectedOrganization: ClientOrganization | null;
  overview: ClientPortalOverview | null;
  memberships: ClientMembership[];
  activities: ClientActivity[];
  queueItems: ClientActionQueueItem[];
  users: User[];
  summary: ReturnType<typeof buildClientPortalSummary>;
  loading: boolean;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  selectClient: (organizationId: string) => void;
  refreshOrganizations: () => Promise<ClientOrganization[]>;
  refreshClient: (organizationId?: string) => Promise<void>;
  refreshCurrent: () => Promise<void>;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
}

type ClientOperationsWorkspaceCache = {
  userId: string;
  organizations: ClientOrganization[];
  overview: ClientPortalOverview | null;
  memberships: ClientMembership[];
  activities: ClientActivity[];
  queueItems: ClientActionQueueItem[];
  users: User[];
};

let clientOperationsWorkspaceCache: ClientOperationsWorkspaceCache | null = null;

function clearClientOperationsWorkspaceCache() {
  clientOperationsWorkspaceCache = null;
}

function getCachedClientOperationsWorkspace(userId: string): ClientOperationsWorkspaceCache | null {
  if (!userId || clientOperationsWorkspaceCache?.userId !== userId) return null;
  return clientOperationsWorkspaceCache;
}

export function useClientOperationsWorkspace(): ClientOperationsWorkspace {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname() || "/operations/clients";
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams.get("client") || "";
  const { user, isLoading: userLoading } = useUser();
  const userId = user?.id != null ? String(user.id) : "";
  const cachedWorkspace = getCachedClientOperationsWorkspace(userId);
  const canManageClients = useMemo(() => hasClientOperationsAccess(user), [user]);
  const shouldLoadUsers = pathname.startsWith("/operations/clients/accounts");

  const [organizations, setOrganizations] = useState<ClientOrganization[]>(() => cachedWorkspace?.organizations ?? []);
  const [overview, setOverview] = useState<ClientPortalOverview | null>(() => cachedWorkspace?.overview ?? null);
  const [memberships, setMemberships] = useState<ClientMembership[]>(() => cachedWorkspace?.memberships ?? []);
  const [activities, setActivities] = useState<ClientActivity[]>(() => cachedWorkspace?.activities ?? []);
  const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>(() => cachedWorkspace?.queueItems ?? []);
  const [users, setUsers] = useState<User[]>(() => cachedWorkspace?.users ?? []);
  const [loading, setLoading] = useState(() => !cachedWorkspace);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleAuthCleared = () => {
      clearClientOperationsWorkspaceCache();
      setOrganizations([]);
      setOverview(null);
      setMemberships([]);
      setActivities([]);
      setQueueItems([]);
      setUsers([]);
      setLoading(false);
      setSaving(false);
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
    return () => window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
  }, []);

  const selectedId = useMemo(() => {
    return getDefaultClientOrganizationId(organizations, selectedFromQuery);
  }, [organizations, selectedFromQuery]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId) || overview?.organization || null,
    [organizations, overview, selectedId],
  );

  const summary = useMemo(() => buildClientPortalSummary(overview), [overview]);

  const selectClient = useCallback((organizationId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (organizationId) {
      nextParams.set("client", organizationId);
    } else {
      nextParams.delete("client");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const refreshOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    const cached = getCachedClientOperationsWorkspace(userId);
    clientOperationsWorkspaceCache = {
      userId,
      organizations: nextOrganizations,
      overview: cached?.overview ?? null,
      memberships: cached?.memberships ?? [],
      activities: cached?.activities ?? [],
      queueItems: cached?.queueItems ?? [],
      users: cached?.users ?? [],
    };
    setOrganizations(nextOrganizations);
    return nextOrganizations;
  }, [userId]);

  const refreshClient = useCallback(async (organizationId = selectedId) => {
    if (!organizationId) {
      setOverview(null);
      setMemberships([]);
      setActivities([]);
      setQueueItems([]);
      return;
    }

    const [nextOverview, nextMemberships, nextActivities, nextQueueItems] = await Promise.all([
      fetchClientOverview(organizationId),
      fetchClientMemberships(organizationId),
      fetchClientActivity(organizationId, { limit: 30 }),
      fetchClientActionQueue(organizationId),
    ]);
    const cached = getCachedClientOperationsWorkspace(userId);
    clientOperationsWorkspaceCache = {
      userId,
      organizations: cached?.organizations ?? organizations,
      overview: nextOverview,
      memberships: nextMemberships,
      activities: nextActivities,
      queueItems: nextQueueItems,
      users: cached?.users ?? users,
    };
    setOverview(nextOverview);
    setMemberships(nextMemberships);
    setActivities(nextActivities);
    setQueueItems(nextQueueItems);
  }, [organizations, selectedId, userId, users]);

  const refreshCurrent = useCallback(async () => {
    await refreshOrganizations();
    if (selectedId) await refreshClient(selectedId);
  }, [refreshClient, refreshOrganizations, selectedId]);

  const submitScoped = useCallback(async (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await action();
      reset();
      await refreshClient(selectedId);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : successMessage);
    } finally {
      setSaving(false);
    }
  }, [refreshClient, selectedId, toast]);

  useEffect(() => {
    if (userLoading) return;
    if (!canManageClients) {
      setLoading(false);
      setOrganizations([]);
      setOverview(null);
      setMemberships([]);
      setActivities([]);
      setQueueItems([]);
      setUsers([]);
      if (clientOperationsWorkspaceCache?.userId === userId) {
        clientOperationsWorkspaceCache = null;
      }
      return;
    }

    let isMounted = true;
    async function loadInitial() {
      try {
        if (!getCachedClientOperationsWorkspace(userId)) {
          setLoading(true);
        }
        await refreshOrganizations();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load client operations");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, [canManageClients, refreshOrganizations, toast, userId, userLoading]);

  useEffect(() => {
    if (userLoading || !canManageClients || !shouldLoadUsers || users.length > 0) return;

    let isMounted = true;
    async function loadUsers() {
      try {
        const nextUsers = await fetchUsers();
        if (isMounted) {
          if (clientOperationsWorkspaceCache?.userId === userId) {
            clientOperationsWorkspaceCache = {
              ...clientOperationsWorkspaceCache,
              users: nextUsers,
            };
          }
          setUsers(nextUsers);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load approved users");
      }
    }

    void loadUsers();
    return () => {
      isMounted = false;
    };
  }, [canManageClients, shouldLoadUsers, toast, userId, userLoading, users.length]);

  useEffect(() => {
    if (userLoading || !canManageClients || loading) return;

    refreshClient(selectedId).catch((error) => {
      console.error(error);
      toast.error("Failed to load client details");
    });
  }, [canManageClients, loading, refreshClient, selectedId, toast, userLoading]);

  return {
    user,
    userLoading,
    canManageClients,
    organizations,
    selectedId,
    selectedOrganization,
    overview,
    memberships,
    activities,
    queueItems,
    users,
    summary,
    loading,
    saving,
    setSaving,
    selectClient,
    refreshOrganizations,
    refreshClient,
    refreshCurrent,
    submitScoped,
  };
}
