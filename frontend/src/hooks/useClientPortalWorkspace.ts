"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import {
  fetchClientActionQueue,
  fetchClientActivity,
  type ClientActionQueueItem,
  type ClientActivity,
} from "@/lib/client-activity";
import {
  ClientOrganization,
  ClientPortalOverview,
  fetchClientPortalBootstrap,
  fetchClientOverview,
} from "@/lib/client-portal";
import { AUTH_SESSION_CLEARED_EVENT } from "@/lib/auth-session";
import { getSettledClientLoadValue } from "@/lib/client-workspace-loading";

export interface ClientPortalWorkspaceState {
  organizations: ClientOrganization[];
  selectedId: string;
  overview: ClientPortalOverview | null;
  activities: ClientActivity[];
  queueItems: ClientActionQueueItem[];
  loading: boolean;
  overviewLoading: boolean;
  setSelectedId: (organizationId: string) => void;
  refreshOverview: () => Promise<void>;
}

type ClientPortalWorkspaceCache = {
  userId: string;
  organizations: ClientOrganization[];
  selectedId: string;
  overview: ClientPortalOverview | null;
  activities: ClientActivity[];
  queueItems: ClientActionQueueItem[];
};

let clientPortalWorkspaceCache: ClientPortalWorkspaceCache | null = null;

function clearClientPortalWorkspaceCache() {
  clientPortalWorkspaceCache = null;
}

function getCachedClientPortalWorkspace(userId: string): ClientPortalWorkspaceCache | null {
  if (!userId || clientPortalWorkspaceCache?.userId !== userId) return null;
  return clientPortalWorkspaceCache;
}

export function useClientPortalWorkspace(): ClientPortalWorkspaceState {
  const toast = useToast();
  const { user } = useUser();
  const userId = user?.id != null ? String(user.id) : "";
  const cachedWorkspace = getCachedClientPortalWorkspace(userId);
  const [organizations, setOrganizations] = useState<ClientOrganization[]>(() => cachedWorkspace?.organizations ?? []);
  const [selectedId, setSelectedIdState] = useState(() => cachedWorkspace?.selectedId ?? "");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(() => cachedWorkspace?.overview ?? null);
  const [activities, setActivities] = useState<ClientActivity[]>(() => cachedWorkspace?.activities ?? []);
  const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>(() => cachedWorkspace?.queueItems ?? []);
  const [loading, setLoading] = useState(() => !cachedWorkspace);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const bootstrappedSelectedIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef(cachedWorkspace?.selectedId ?? "");

  useEffect(() => {
    const handleAuthCleared = () => {
      clearClientPortalWorkspaceCache();
      bootstrappedSelectedIdRef.current = null;
      selectedIdRef.current = "";
      setOrganizations([]);
      setSelectedIdState("");
      setOverview(null);
      setActivities([]);
      setQueueItems([]);
      setLoading(false);
      setOverviewLoading(false);
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
    return () => window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
  }, []);

  const loadBootstrap = useCallback(async () => {
    const bootstrap = await fetchClientPortalBootstrap();
    const nextSelectedId = selectedIdRef.current || bootstrap.selectedId || "";
    clientPortalWorkspaceCache = {
      userId,
      organizations: bootstrap.organizations,
      selectedId: nextSelectedId,
      overview: bootstrap.overview,
      activities: bootstrap.activities,
      queueItems: bootstrap.queueItems,
    };
    bootstrappedSelectedIdRef.current = bootstrap.selectedId || null;
    setOrganizations(bootstrap.organizations);
    setSelectedIdState((current) => current || bootstrap.selectedId || "");
    setOverview(bootstrap.overview);
    setActivities(bootstrap.activities);
    setQueueItems(bootstrap.queueItems);
  }, [userId]);

  const loadOverview = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      const cachedOrganizations = getCachedClientPortalWorkspace(userId)?.organizations ?? [];
      setOverview(null);
      setActivities([]);
      setQueueItems([]);
      clientPortalWorkspaceCache = {
        userId,
        organizations: cachedOrganizations,
        selectedId: "",
        overview: null,
        activities: [],
        queueItems: [],
      };
      return;
    }

    setOverviewLoading(true);
    try {
      const nextOverview = await fetchClientOverview(organizationId);
      const [activitiesResult, queueItemsResult] = await Promise.allSettled([
        fetchClientActivity(organizationId, { limit: 30 }),
        fetchClientActionQueue(organizationId),
      ]);
      const reportSecondaryLoadFailure = (error: unknown) => {
        console.error("[Client Portal] Secondary client data failed to load:", error);
      };
      const nextActivities = getSettledClientLoadValue(activitiesResult, [], reportSecondaryLoadFailure);
      const nextQueueItems = getSettledClientLoadValue(queueItemsResult, [], reportSecondaryLoadFailure);
      const cachedOrganizations = getCachedClientPortalWorkspace(userId)?.organizations ?? [];
      clientPortalWorkspaceCache = {
        userId,
        organizations: cachedOrganizations,
        selectedId: organizationId,
        overview: nextOverview,
        activities: nextActivities,
        queueItems: nextQueueItems,
      };
      setOverview(nextOverview);
      setActivities(nextActivities);
      setQueueItems(nextQueueItems);
    } finally {
      setOverviewLoading(false);
    }
  }, [userId]);

  const setSelectedId = useCallback((organizationId: string) => {
    selectedIdRef.current = organizationId;
    setSelectedIdState(organizationId);
    if (clientPortalWorkspaceCache?.userId === userId) {
      clientPortalWorkspaceCache = {
        ...clientPortalWorkspaceCache,
        selectedId: organizationId,
      };
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        if (!getCachedClientPortalWorkspace(userId)) {
          setLoading(true);
        }
        await loadBootstrap();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load client workspace");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, [loadBootstrap, toast, userId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelected() {
      if (loading) return;
      if (bootstrappedSelectedIdRef.current === selectedId) {
        bootstrappedSelectedIdRef.current = null;
        return;
      }

      try {
        await loadOverview(selectedId);
      } catch (error) {
        console.error(error);
        if (isMounted) toast.error("Failed to load client overview");
      }
    }

    void loadSelected();

    return () => {
      isMounted = false;
    };
  }, [loadOverview, loading, selectedId, toast]);

  const refreshOverview = useCallback(async () => {
    await loadOverview(selectedId);
  }, [loadOverview, selectedId]);

  return {
    organizations,
    selectedId,
    overview,
    activities,
    queueItems,
    loading,
    overviewLoading,
    setSelectedId,
    refreshOverview,
  };
}
