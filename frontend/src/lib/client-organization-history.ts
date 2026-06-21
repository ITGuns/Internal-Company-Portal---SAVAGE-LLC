export interface ClientOrganizationHistoryItem {
  id: string;
  status?: string | null;
}

function normalizeClientOrganizationStatus(status?: string | null): string {
  return (status || "active").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isArchivedClientOrganization(organization: ClientOrganizationHistoryItem): boolean {
  return normalizeClientOrganizationStatus(organization.status) === "archived";
}

export function splitClientOrganizationsByHistory<T extends ClientOrganizationHistoryItem>(organizations: T[]) {
  return {
    current: organizations.filter((organization) => !isArchivedClientOrganization(organization)),
    history: organizations.filter(isArchivedClientOrganization),
  };
}

export function getDefaultClientOrganizationId<T extends ClientOrganizationHistoryItem>(
  organizations: T[],
  requestedId?: string | null,
): string {
  if (requestedId && organizations.some((organization) => organization.id === requestedId)) return requestedId;

  const { current, history } = splitClientOrganizationsByHistory(organizations);
  return current[0]?.id || history[0]?.id || requestedId || "";
}
