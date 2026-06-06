import type { ClientServiceTier } from "./client-portal";

const CLIENT_SERVICE_TIER_LEVELS: Record<string, number> = {
  "Standard Business Website": 1,
  "Growth Business Website": 2,
  "Conversion and Local Growth System": 3,
  "Managed Growth Website System": 4,
  "Premium Managed Growth System": 5,
};

export function sortClientServiceTiers(tiers: ClientServiceTier[]): ClientServiceTier[] {
  return [...tiers].sort((first, second) => {
    const priorityDifference = (second.priorityRank ?? 0) - (first.priorityRank ?? 0);
    return priorityDifference || first.name.localeCompare(second.name);
  });
}

export function getClientServiceTierLevel(tier: Pick<ClientServiceTier, "name">): number | null {
  return CLIENT_SERVICE_TIER_LEVELS[tier.name] ?? null;
}

export function getClientServiceTierDisplayName(tier: Pick<ClientServiceTier, "name">): string {
  const level = getClientServiceTierLevel(tier);
  return level ? `${tier.name} (Tier ${level})` : tier.name;
}

export function upsertClientServiceTier(
  tiers: ClientServiceTier[],
  savedTier: ClientServiceTier,
): ClientServiceTier[] {
  const existingIndex = tiers.findIndex((tier) => tier.id === savedTier.id);
  if (existingIndex === -1) return sortClientServiceTiers([...tiers, savedTier]);

  const nextTiers = [...tiers];
  nextTiers[existingIndex] = savedTier;
  return sortClientServiceTiers(nextTiers);
}

export function removeClientServiceTier(tiers: ClientServiceTier[], tierId: string): ClientServiceTier[] {
  return tiers.filter((tier) => tier.id !== tierId);
}
