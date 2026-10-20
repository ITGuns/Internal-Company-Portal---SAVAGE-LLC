"use client";

import { useCallback, useState } from "react";
import type { Employee } from "@/lib/payroll-calendar/types";

/**
 * Set Up Payroll and Payroll options are never stacked: "Manage options" in
 * the setup dialog closes it, opens the options, and reopens the setup (with
 * the unsaved form kept) when the options close.
 */
export function usePayrollSetupDialogs() {
  const [setupEmployee, setSetupEmployee] = useState<Employee | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [returnToSetup, setReturnToSetup] = useState(false);

  const openSetup = useCallback((employee: Employee) => {
    setSetupEmployee(employee);
    setReturnToSetup(false);
    setSetupOpen(true);
  }, []);

  const closeSetup = useCallback(() => {
    setSetupOpen(false);
    setReturnToSetup(false);
  }, []);

  const openManager = useCallback(() => {
    setReturnToSetup(false);
    setManagerOpen(true);
  }, []);

  const manageFromSetup = useCallback(() => {
    setSetupOpen(false);
    setReturnToSetup(true);
    setManagerOpen(true);
  }, []);

  const closeManager = useCallback(() => {
    setManagerOpen(false);
    if (returnToSetup) setSetupOpen(true);
  }, [returnToSetup]);

  return {
    setupEmployee,
    setupOpen,
    managerOpen,
    /** True while the setup dialog should keep its unsaved form. */
    returnToSetup,
    openSetup,
    closeSetup,
    openManager,
    manageFromSetup,
    closeManager,
  };
}

export type PayrollSetupDialogsState = ReturnType<typeof usePayrollSetupDialogs>;
