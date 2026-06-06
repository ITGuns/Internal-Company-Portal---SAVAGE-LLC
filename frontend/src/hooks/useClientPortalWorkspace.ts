"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
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

export function useClientPortalWorkspace(): ClientPortalWorkspaceState {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const bootstrappedSelectedIdRef = useRef<string | null>(null);

  const loadBootstrap = useCallback(async () => {
    const bootstrap = await fetchClientPortalBootstrap();
    bootstrappedSelectedIdRef.current = bootstrap.selectedId || null;
    setOrganizations(bootstrap.organizations);
    setSelectedId((current) => current || bootstrap.selectedId || "");
    setOverview(bootstrap.overview);
    setActivities(bootstrap.activities);
    setQueueItems(bootstrap.queueItems);
  }, []);

  const loadOverview = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setOverview(null);
      setActivities([]);
      setQueueItems([]);
      return;
    }

    setOverviewLoading(true);
    try {
      const [nextOverview, nextActivities, nextQueueItems] = await Promise.all([
        fetchClientOverview(organizationId),
        fetchClientActivity(organizationId, { limit: 30 }),
        fetchClientActionQueue(organizationId),
      ]);
      setOverview(nextOverview);
      setActivities(nextActivities);
      setQueueItems(nextQueueItems);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        setLoading(true);
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
  }, [loadBootstrap, toast]);

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
