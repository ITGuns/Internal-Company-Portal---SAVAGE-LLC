"use client";

import React from "react";
import { ProductionPanel } from "@/components/workspace/ProductionWorkspace";

interface ClientPortalPanelProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
}

export default function ClientPortalPanel({
  title,
  icon: Icon,
  children,
  count,
  action,
}: ClientPortalPanelProps) {
  return (
    <ProductionPanel title={title} icon={Icon} count={count} action={action}>
      {children}
    </ProductionPanel>
  );
}
