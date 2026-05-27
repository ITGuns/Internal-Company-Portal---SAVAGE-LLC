"use client";

import { useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import {
  ClientResourceLink,
  createClientResource,
} from "@/lib/client-portal";
import ClientOperationsPanel from "./ClientOperationsPanel";

const emptyResource = { label: "", url: "", type: "link", visibleToClient: true, projectId: "" };

interface AdminClientResourcesPanelProps {
  organizationId: string;
  resources: ClientResourceLink[];
  saving: boolean;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
}

export default function AdminClientResourcesPanel({
  organizationId,
  resources,
  saving,
  submitScoped,
}: AdminClientResourcesPanelProps) {
  const [resourceForm, setResourceForm] = useState(emptyResource);

  return (
    <ClientOperationsPanel icon={LinkIcon} title="Shared Resources" count={resources.length}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitScoped(
            () => createClientResource(organizationId, resourceForm),
            "Client resource added",
            () => setResourceForm(emptyResource),
          );
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="resource-label" label="Label" value={resourceForm.label} onChange={(label) => setResourceForm((form) => ({ ...form, label }))} required />
          <FormField id="resource-url" label="URL" value={resourceForm.url} onChange={(url) => setResourceForm((form) => ({ ...form, url }))} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={resourceForm.visibleToClient} onChange={(event) => setResourceForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
          Visible to client
        </label>
        <Button type="submit" loading={saving}>Add Resource</Button>
      </form>
    </ClientOperationsPanel>
  );
}
