"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { PayrollProfile } from "@/lib/payroll-setup";
import type { PayrollSetupDialogsState } from "./usePayrollSetupDialogs";

// Loaded on first open only.
const PayrollSetupModal = dynamic(() => import("./PayrollSetupModal"), { ssr: false });
const PayrollOptionsManager = dynamic(() => import("./PayrollOptionsManager"), { ssr: false });

interface PayrollSetupDialogsProps {
  dialogs: PayrollSetupDialogsState;
  /** Payroll roles: shows "Manage options" inside Set Up Payroll. */
  canManageOptions: boolean;
  onSaved?: (employeeId: string, profile: PayrollProfile) => void;
}

/** Set Up Payroll plus Payroll options, one dialog at a time (usePayrollSetupDialogs). */
export default function PayrollSetupDialogs({ dialogs, canManageOptions, onSaved }: PayrollSetupDialogsProps) {
  return (
    <>
      {(dialogs.setupOpen || dialogs.returnToSetup) && (
        <PayrollSetupModal
          isOpen={dialogs.setupOpen}
          onClose={dialogs.closeSetup}
          employee={dialogs.setupEmployee}
          onSaved={onSaved}
          onManageOptions={canManageOptions ? dialogs.manageFromSetup : undefined}
          preserveDraft={dialogs.returnToSetup}
        />
      )}
      {canManageOptions && dialogs.managerOpen && (
        <PayrollOptionsManager
          isOpen={dialogs.managerOpen}
          onClose={dialogs.closeManager}
          closeLabel={dialogs.returnToSetup ? "Back to payroll setup" : "Done"}
        />
      )}
    </>
  );
}
