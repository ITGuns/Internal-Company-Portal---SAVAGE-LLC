import type { ClientServiceTier } from "./client-portal";

export function sortClientServiceTiers(tiers: ClientServiceTier[]): ClientServiceTier[] {
  return [...tiers].sort((first, second) => {
    const priorityDifference = (second.priorityRank ?? 0) - (first.priorityRank ?? 0);
    return priorityDifference || first.name.localeCompare(second.name);
  });
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
