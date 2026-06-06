import type { ClientPortalOverview } from "@/lib/client-portal";

export type SubmitScoped = (
  action: () => Promise<unknown>,
  successMessage: string,
  reset: () => void,
) => void | Promise<void>;

export interface ProductionRecordPanelProps {
  organizationId: string;
  overview: ClientPortalOverview;
  saving: boolean;
  submitScoped: SubmitScoped;
  recordLimit?: number;
  layout?: "compact" | "full";
}
