"use client";

import Header from "@/components/Header";
import { X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import ProfileEditForm from "@/components/ProfileEditForm";
import { useRouter } from "next/navigation";
import { ProfileSkeleton } from "@/components/ui/FeatureSkeletons";

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) {
    return (
      <main style={{ minHeight: "calc(100vh - var(--header-height))" }} className="p-6">
        <Header title="Profile" subtitle="Manage your account" />
        <ProfileSkeleton />
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ minHeight: "calc(100vh - var(--header-height))" }} className="p-6">
        <Header title="Profile" subtitle="Manage your account" />
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-6">
          <p className="font-medium">Profile unavailable</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Please sign in again to view your account details.</p>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{ minHeight: "calc(100vh - var(--header-height))" }}
      className="bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="p-6 pt-0">
        <Header
          title="Profile"
          subtitle="Your personal information and account settings"
        />

        <div className="mt-6 max-w-3xl mx-auto">
          <section id="edit-profile" className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-6 md:p-8 shadow-sm">
            <button
              onClick={() => router.push("/dashboard")}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]"
              aria-label="Close edit profile"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6 pr-8">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Account Settings</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Update your profile details and view role permissions.</p>
            </div>
            <ProfileEditForm user={user} onCancel={() => router.push("/dashboard")} />
          </section>
        </div>
      </div>
    </main>
  );
}
