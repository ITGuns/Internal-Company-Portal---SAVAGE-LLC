"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Save } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientServiceTier } from "@/lib/client-portal";
import {
  clientOperationsSelectClass,
  clientOperationsTextareaClass,
} from "./ClientOperationsPanel";

interface ServiceTierDraft {
  name: string;
  description: string;
  monthlyPrice: string;
  priorityRank: string;
}

type CreateTierPayload = {
  name: string;
  description?: string;
  monthlyPrice?: number;
  priorityRank?: number;
};

type UpdateTierPayload = {
  name: string;
  description: string | null;
  monthlyPrice: number | null;
  priorityRank: number;
};

const emptyTierDraft: ServiceTierDraft = {
  name: "",
  description: "",
  monthlyPrice: "",
  priorityRank: "0",
};

function toTierDraft(tier: ClientServiceTier): ServiceTierDraft {
  return {
    name: tier.name,
    description: tier.description || "",
    monthlyPrice: tier.monthlyPrice === null || tier.monthlyPrice === undefined ? "" : String(tier.monthlyPrice),
    priorityRank: String(tier.priorityRank ?? 0),
  };
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numberValue = Number(trimmed);
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

export default function AdminClientServiceTiersPanel({
  tiers,
  saving,
  onCreate,
  onUpdate,
}: {
  tiers: ClientServiceTier[];
  saving: boolean;
  onCreate: (payload: CreateTierPayload) => Promise<ClientServiceTier>;
  onUpdate: (tierId: string, payload: UpdateTierPayload) => Promise<ClientServiceTier>;
}) {
  const [selectedTierId, setSelectedTierId] = useState("");
  const [tierForm, setTierForm] = useState<ServiceTierDraft>(emptyTierDraft);

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === selectedTierId) || null,
    [selectedTierId, tiers],
  );

  useEffect(() => {
    if (!selectedTierId) return;
    if (!selectedTier) {
      setSelectedTierId("");
      setTierForm(emptyTierDraft);
      return;
    }

    setTierForm(toTierDraft(selectedTier));
  }, [selectedTier, selectedTierId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = tierForm.name.trim();
    if (!name) return;

    const priorityRank = toOptionalNumber(tierForm.priorityRank) ?? 0;
    const monthlyPrice = toOptionalNumber(tierForm.monthlyPrice);

    try {
      if (selectedTierId) {
        const savedTier = await onUpdate(selectedTierId, {
          name,
          description: tierForm.description.trim() || null,
          monthlyPrice: monthlyPrice ?? null,
          priorityRank,
        });
        setTierForm(toTierDraft(savedTier));
        return;
      }

      const savedTier = await onCreate({
        name,
        ...(tierForm.description.trim() ? { description: tierForm.description.trim() } : {}),
        ...(monthlyPrice !== undefined ? { monthlyPrice } : {}),
        priorityRank,
      });
      setSelectedTierId(savedTier.id);
      setTierForm(toTierDraft(savedTier));
    } catch {
      return;
    }
  }

  function resetForm() {
    setSelectedTierId("");
    setTierForm(emptyTierDraft);
  }

  return (
    <div className="space-y-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Tier</span>
        <select
          className={clientOperationsSelectClass}
          value={selectedTierId}
          onChange={(event) => {
            const tierId = event.target.value;
            setSelectedTierId(tierId);
            const tier = tiers.find((item) => item.id === tierId);
            setTierForm(tier ? toTierDraft(tier) : emptyTierDraft);
          }}
          disabled={saving}
        >
          <option value="">New service tier</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id="service-tier-name"
            label="Name"
            value={tierForm.name}
            onChange={(name) => setTierForm((form) => ({ ...form, name }))}
            placeholder="Growth Care"
            required
          />
          <FormField
            id="service-tier-price"
            label="Monthly Price"
            type="number"
            min={0}
            step="0.01"
            value={tierForm.monthlyPrice}
            onChange={(monthlyPrice) => setTierForm((form) => ({ ...form, monthlyPrice }))}
            placeholder="1750"
          />
          <FormField
            id="service-tier-priority"
            label="Priority Rank"
            type="number"
            min={0}
            step={1}
            value={tierForm.priorityRank}
            onChange={(priorityRank) => setTierForm((form) => ({ ...form, priorityRank }))}
          />
        </div>
        <textarea
          className={clientOperationsTextareaClass}
          value={tierForm.description}
          onChange={(event) => setTierForm((form) => ({ ...form, description: event.target.value }))}
          placeholder="Tier description"
          aria-label="Service tier description"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            loading={saving}
            icon={selectedTierId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          >
            {selectedTierId ? "Update Tier" : "Add Tier"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={resetForm}
          >
            New Tier
          </Button>
        </div>
      </form>

      {tiers.length > 0 ? (
        <div className="grid gap-2">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                setSelectedTierId(tier.id);
                setTierForm(toTierDraft(tier));
              }}
              className="grid gap-1 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="font-medium">{tier.name}</span>
              <span className="text-xs text-[var(--muted)]">
                Priority {tier.priorityRank ?? 0}
                {tier.monthlyPrice === null || tier.monthlyPrice === undefined ? "" : ` - $${tier.monthlyPrice}`}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
