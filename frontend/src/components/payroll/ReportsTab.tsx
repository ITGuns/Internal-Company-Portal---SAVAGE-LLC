/**
 * Reports Tab - placeholder for payroll reports and analytics
 */

import React from "react";
import { BarChart3 } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";

export default function ReportsTab() {
  const toast = useToast();

  return (
    <div className="p-6 pt-0">
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-[var(--muted)] mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payroll Reports</h3>
        <p className="text-[var(--muted)] mb-4">
          Generate comprehensive payroll reports and analytics
        </p>
        <Button
          variant="primary"
          onClick={() => toast.info("Reports coming soon!")}
        >
          Coming Soon
        </Button>
      </div>
    </div>
  );
}
