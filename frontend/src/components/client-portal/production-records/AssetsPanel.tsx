"use client";

import { useEffect, useState, useRef } from "react";
import { FolderOpen, Upload } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import { apiFetch } from "@/lib/api";
import type { ClientAsset } from "@/lib/client-portal";
import {
  createClientAsset,
  updateClientAsset,
} from "@/lib/client-portal";
import {
  buildAssetUpdatePayload,
  type AssetEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_ASSET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  EditFormActions,
  InlineRecordControls,
  MiniPanel,
  RecordHeader,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

type AssetCreateForm = {
  label: string;
  url: string;
  type: string;
  status: string;
  notes: string;
  visibleToClient: boolean;
  uploadId?: string;
};

const emptyAsset: AssetCreateForm = { label: "", url: "", type: "file", status: "received", notes: "", visibleToClient: true };

function toAssetForm(asset: ClientAsset): AssetEditForm {
  return {
    label: asset.label || "",
    url: asset.url || "",
    type: asset.type || "file",
    status: asset.status || "received",
    notes: asset.notes || "",
    visibleToClient: asset.visibleToClient !== false,
  };
}

function AssetRecord({
  asset,
  saving,
  submitScoped,
}: {
  asset: ClientAsset;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<AssetEditForm>(() => toAssetForm(asset));

  useEffect(() => {
    if (!isEditing) setForm(toAssetForm(asset));
  }, [asset, isEditing]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <RecordHeader
        title={asset.label}
        subtitle={getClientPortalOptionLabel(CLIENT_ASSET_STATUSES, asset.status)}
        isEditing={isEditing}
        saving={saving}
        onToggleEdit={() => setIsEditing((current) => !current)}
      />

      <InlineRecordControls
        status={asset.status}
        statusOptions={CLIENT_ASSET_STATUSES}
        visibleToClient={asset.visibleToClient !== false}
        saving={saving}
        archiveDisabled={asset.status === "archived"}
        onSave={(data) => submitScoped(() => updateClientAsset(asset.id, data), "Asset updated", () => undefined)}
        onArchive={() => submitScoped(() => updateClientAsset(asset.id, { status: "archived" }), "Asset archived", () => undefined)}
      />

      {isEditing ? (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => updateClientAsset(asset.id, buildAssetUpdatePayload(form)),
              "Asset details saved",
              () => setIsEditing(false),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id={`asset-label-${asset.id}`} label="Label" value={form.label} onChange={(label) => setForm((current) => ({ ...current, label }))} required />
            <FormField id={`asset-url-${asset.id}`} label="URL" value={form.url} onChange={(url) => setForm((current) => ({ ...current, url }))} required />
            <FormField id={`asset-type-${asset.id}`} label="Type" value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))} />
            <select className={selectClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="Asset status">
              {CLIENT_ASSET_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <TextareaField value={form.notes || ""} onChange={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="Internal asset notes" ariaLabel={`Asset notes for ${asset.label}`} />
          <VisibilityCheckbox checked={form.visibleToClient} onChange={(visibleToClient) => setForm((current) => ({ ...current, visibleToClient }))} />
          <EditFormActions saving={saving} onCancel={() => setIsEditing(false)} />
        </form>
      ) : null}
    </div>
  );
}

export default function AssetsPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
}: ProductionRecordPanelProps) {
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const assets = typeof recordLimit === "number" ? (overview.assets || []).slice(0, recordLimit) : (overview.assets || []);
  const canAddAsset = Boolean(assetForm.label.trim() && assetForm.url.trim()) && !saving;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type on client side
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.doc', '.docx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      alert('Supported formats: PNG, JPG, GIF, PDF, TXT, DOC, DOCX');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target?.result as string;

        // 1. Upload to backend
        const uploadRes = await apiFetch('/uploads', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: base64Data,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Upload failed');
        }

        const uploadResult = await uploadRes.json();

        // 2. Populate form fields
        setAssetForm((form) => ({
          ...form,
          label: file.name,
          url: uploadResult.url,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          uploadId: uploadResult.id,
        }));
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to upload file');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert('Failed to read file');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <MiniPanel title="Assets" icon={FolderOpen} count={overview.assets?.length || 0}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAddAsset) return;

          // Guard against duplicates — same label OR same URL already exists
          const normalizedUrl = assetForm.url.trim().toLowerCase();
          const normalizedLabel = assetForm.label.trim().toLowerCase();
          const isDuplicate = (overview.assets || []).some(
            (a) =>
              a.url.trim().toLowerCase() === normalizedUrl ||
              a.label.trim().toLowerCase() === normalizedLabel,
          );
          if (isDuplicate) {
            alert('An asset with the same label or URL already exists for this client.');
            return;
          }

          submitScoped(
            () => createClientAsset(organizationId, assetForm),
            "Client asset added",
            () => setAssetForm(emptyAsset),
          );
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="asset-label" label="Label" value={assetForm.label} onChange={(label) => setAssetForm((form) => ({ ...form, label }))} required />
          <FormField id="asset-url" label="URL" value={assetForm.url} onChange={(url) => setAssetForm((form) => ({ ...form, url, uploadId: undefined }))} required />
          <FormField id="asset-type" label="Type" value={assetForm.type} onChange={(type) => setAssetForm((form) => ({ ...form, type }))} />
          <select className={selectClass} value={assetForm.status} onChange={(event) => setAssetForm((form) => ({ ...form, status: event.target.value }))} aria-label="Asset status">
            {CLIENT_ASSET_STATUSES.filter((status) => status.value !== "archived").map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
        <VisibilityCheckbox checked={assetForm.visibleToClient} onChange={(visibleToClient) => setAssetForm((form) => ({ ...form, visibleToClient }))} />
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.doc,.docx"
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          >
            Upload File
          </Button>
          <Button type="submit" loading={saving} disabled={!canAddAsset}>Add Asset</Button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {assets.map((asset) => (
          <AssetRecord key={asset.id} asset={asset} saving={saving} submitScoped={submitScoped} />
        ))}
      </div>
    </MiniPanel>
  );
}
