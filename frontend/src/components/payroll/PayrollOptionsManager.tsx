"use client";

import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import LabelOptionsSection from "./LabelOptionsSection";
import SchemeOptionsSection from "./SchemeOptionsSection";

interface PayrollOptionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Footer button text; "Back to payroll setup" when opened from Set Up Payroll. */
  closeLabel?: string;
}

/**
 * Payroll options (2026-10-20), payroll roles only: the salary divisor
 * schemes, employment types and pay frequency labels Set Up Payroll offers.
 * Opened on its own (never on top of another dialog).
 */
export default function PayrollOptionsManager({ isOpen, onClose, closeLabel = "Done" }: PayrollOptionsManagerProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payroll options"
      subtitle="Lists used by Set Up Payroll. Renaming never changes anyone's setup; a list item in use can be archived, not deleted."
      size="xl"
      bodyClassName="max-h-[calc(100dvh-13rem)]"
      footer={<Button type="button" variant="primary" onClick={onClose}>{closeLabel}</Button>}
    >
      <div className="space-y-8">
        <SchemeOptionsSection />
        <LabelOptionsSection
          category="employment_type"
          title="Employment types"
          description="Shown on payroll profiles. New employees start on the default."
          emptyText="No employment types yet. Add one, for example Full-Time."
        />
        <LabelOptionsSection
          category="payment_frequency"
          title="Pay frequency labels"
          description="A label on each profile. Pay periods follow the company payroll cycle, not this label."
          emptyText="No pay frequency labels yet. Add one, for example Monthly."
        />
      </div>
    </Modal>
  );
}
