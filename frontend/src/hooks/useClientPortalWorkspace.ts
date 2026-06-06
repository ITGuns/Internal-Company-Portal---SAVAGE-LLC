"use client";

import { useCallback, useEffect, useState } from "react";
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
  fetchClientOrganizations,
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

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
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
        await loadOrganizations();
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
  }, [loadOrganizations, toast]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelected() {
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
  }, [loadOverview, selectedId, toast]);

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
