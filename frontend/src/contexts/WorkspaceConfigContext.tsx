"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  DEFAULT_WORKSPACE_CONFIG,
  fetchWorkspaceConfig,
  type PublicWorkspaceConfig,
} from "@/lib/workspace-config";

const WorkspaceConfigContext = createContext<PublicWorkspaceConfig>(DEFAULT_WORKSPACE_CONFIG);

export function WorkspaceConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicWorkspaceConfig>(DEFAULT_WORKSPACE_CONFIG);

  useEffect(() => {
    let isMounted = true;

    fetchWorkspaceConfig().then((workspaceConfig) => {
      if (isMounted) setConfig(workspaceConfig);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (config.name && config.name !== "Deskii") {
      document.title = `${config.name} | Internal Portal`;
    }

    if (config.logoUrl) {
      const links = document.querySelectorAll("link[rel*='icon']");
      links.forEach((l) => l.remove());

      const link = document.createElement("link");
      link.type = "image/png";
      link.rel = "icon";
      link.href = config.logoUrl;
      document.head.appendChild(link);

      const appleLink = document.querySelector("link[rel='apple-touch-icon']");
      if (appleLink) {
        (appleLink as HTMLLinkElement).href = config.logoUrl;
      } else {
        const newAppleLink = document.createElement("link");
        newAppleLink.rel = "apple-touch-icon";
        newAppleLink.href = config.logoUrl;
        document.head.appendChild(newAppleLink);
      }
    }
  }, [config]);

  return (
    <WorkspaceConfigContext.Provider value={config}>
      {children}
    </WorkspaceConfigContext.Provider>
  );
}

export function useWorkspaceConfig() {
  return useContext(WorkspaceConfigContext);
}
