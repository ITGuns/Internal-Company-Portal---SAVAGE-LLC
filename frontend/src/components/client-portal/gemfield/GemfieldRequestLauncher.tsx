"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import TicketWizard from "./TicketWizard";

// Entry point for the guided request wizard. Render only for entitled orgs (the parent gates on
// organization.gemfieldClient). supportPhone/callback hours come from config (#S) when provisioned.
export default function GemfieldRequestLauncher({
  organizationId,
  supportPhone,
}: {
  organizationId: string;
  supportPhone?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 text-sm font-semibold text-white"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden /> Start a request
      </button>
      {open ? (
        <TicketWizard
          organizationId={organizationId}
          supportPhone={supportPhone}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
