"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getCurrentUser } from "@/lib/api";
import { getAuthenticatedLandingPath } from "@/lib/role-access";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const message = "Finishing secure sign-in...";

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        await refreshUser();
        const refreshedUser = getCurrentUser();
        if (refreshedUser && !cancelled) {
          router.replace(getAuthenticatedLandingPath(refreshedUser));
          return;
        }
        if (!cancelled) {
          const provider = new URLSearchParams(window.location.search).get("provider") || "oauth";
          router.replace(`/login?provider=${encodeURIComponent(provider)}&oauthError=failed`);
        }
      } catch {
        if (!cancelled) {
          const provider = new URLSearchParams(window.location.search).get("provider") || "oauth";
          router.replace(`/login?provider=${encodeURIComponent(provider)}&oauthError=failed`);
        }
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [refreshUser, router]);

  useEffect(() => {
    if (user) {
      router.replace(getAuthenticatedLandingPath(user));
    }
  }, [router, user]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-6 text-[var(--foreground)]">
      <section className="w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-6 text-center shadow-[var(--shadow-md)]">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold">Signing you in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      </section>
    </main>
  );
}
