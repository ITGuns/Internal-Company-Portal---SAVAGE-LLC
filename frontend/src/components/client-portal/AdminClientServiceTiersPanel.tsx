"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientServiceTier } from "@/lib/client-portal";
import { getClientServiceTierDisplayName, getClientServiceTierLevel } from "@/lib/client-service-tiers";
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
  onDelete,
}: {
  tiers: ClientServiceTier[];
  saving: boolean;
  onCreate: (payload: CreateTierPayload) => Promise<ClientServiceTier>;
  onUpdate: (tierId: string, payload: UpdateTierPayload) => Promise<ClientServiceTier>;
  onDelete: (tierId: string) => Promise<void>;
}) {
  const [selectedTierId, setSelectedTierId] = useState("");
  const [tierForm, setTierForm] = useState<ServiceTierDraft>(emptyTierDraft);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === selectedTierId) || null,
    [selectedTierId, tiers],
  );
  const canDeleteSelectedTier = Boolean(selectedTier) && deleteConfirmation.trim() === selectedTier?.name;

  useEffect(() => {
    if (!selectedTierId) return;
    if (!selectedTier) {
      setSelectedTierId("");
      setTierForm(emptyTierDraft);
      return;
    }

    setTierForm(toTierDraft(selectedTier));
  }, [selectedTier, selectedTierId]);

  useEffect(() => {
    setDeleteConfirmation("");
  }, [selectedTier?.id, selectedTier?.name]);

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

  async function handleDelete() {
    if (!selectedTier || !canDeleteSelectedTier) return;

    try {
      await onDelete(selectedTier.id);
      resetForm();
    } catch {
      return;
    }
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
              {getClientServiceTierDisplayName(tier)}
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

      {selectedTier ? (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
            <div className="text-sm font-semibold text-red-700">Delete {selectedTier.name}</div>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Existing clients using this tier will be set to not assigned.
          </p>
          <label htmlFor="service-tier-delete-confirmation" className="grid gap-2 text-sm">
            <span className="font-medium">Type &quot;{selectedTier.name}&quot; to confirm</span>
            <input
              id="service-tier-delete-confirmation"
              className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={selectedTier.name}
              disabled={saving}
            />
          </label>
          <Button
            type="button"
            variant="danger"
            disabled={!canDeleteSelectedTier || saving}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            fullWidth
          >
            Delete Tier
          </Button>
        </div>
      ) : null}

      {tiers.length > 0 ? (
        <div className="grid gap-2">
          {tiers.map((tier) => {
            const tierLevel = getClientServiceTierLevel(tier);

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setSelectedTierId(tier.id);
                  setTierForm(toTierDraft(tier));
                }}
                className="grid gap-1 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
              >
                <span className="font-medium">{getClientServiceTierDisplayName(tier)}</span>
                <span className="text-xs text-[var(--muted)]">
                  {tierLevel ? `Tier ${tierLevel} - ` : ""}
                  Priority {tier.priorityRank ?? 0}
                  {tier.monthlyPrice === null || tier.monthlyPrice === undefined ? "" : ` - $${tier.monthlyPrice}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
