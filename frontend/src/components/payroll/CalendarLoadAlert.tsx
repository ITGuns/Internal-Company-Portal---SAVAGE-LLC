/**
 * Load failure on the payroll calendar (time entries or events), with a retry.
 * Same pattern as the request queues in ApprovalsTab. The grid stays mounted.
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "@/components/Button";

interface CalendarLoadAlertProps {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

export default function CalendarLoadAlert({ message, onRetry, retrying = false }: CalendarLoadAlertProps) {
  return (
    <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Could not load time entries and events.</div>
          {/* The server message may lack a full stop, so it gets its own line. */}
          <div className="mt-1 break-words text-[var(--muted)]">{message}</div>
          <div className="mt-1 text-[var(--muted)]">The calendar may be missing records until this loads.</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            loading={retrying}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
