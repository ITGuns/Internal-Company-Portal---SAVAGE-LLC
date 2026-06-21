export interface PublicWorkspaceConfig {
  name: string;
  logoUrl: string | null;
  logoAlt: string;
  tagline: string;
  signInMessage: string;
}

export const DEFAULT_WORKSPACE_CONFIG: PublicWorkspaceConfig = {
  name: "Deskii",
  logoUrl: null,
  logoAlt: "Deskii logo",
  tagline: "Your workspace",
  signInMessage: "Sign in to your Deskii workspace",
};

let workspaceConfigPromise: Promise<PublicWorkspaceConfig> | null = null;

export async function fetchWorkspaceConfig(): Promise<PublicWorkspaceConfig> {
  if (!workspaceConfigPromise) {
    workspaceConfigPromise = fetch("/api/workspace/public", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) return DEFAULT_WORKSPACE_CONFIG;
        const data = await response.json();
        return {
          ...DEFAULT_WORKSPACE_CONFIG,
          ...data,
          logoUrl: typeof data.logoUrl === "string" && data.logoUrl.trim() ? data.logoUrl : null,
        };
      })
      .catch(() => DEFAULT_WORKSPACE_CONFIG);
  }

  return workspaceConfigPromise;
}
