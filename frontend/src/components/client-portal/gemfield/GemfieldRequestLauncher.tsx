"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import TicketWizard from "./TicketWizard";
import { fetchGemfieldSupport } from "@/lib/gemfield";

// Entry point for the guided request wizard. Render only for entitled orgs (the parent gates on
// organization.gemfieldClient). Support phone + callback hours come from config (#S) when provisioned.
export default function GemfieldRequestLauncher({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [supportPhone, setSupportPhone] = useState<string | null>(null);
  const [callbackHours, setCallbackHours] = useState<string | null>(null);

  useEffect(() => {
    fetchGemfieldSupport(organizationId)
      .then((config) => {
        setSupportPhone(config.supportPhone);
        setCallbackHours(config.callbackHours);
      })
      .catch(() => {});
  }, [organizationId]);

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
          callbackHours={callbackHours}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
