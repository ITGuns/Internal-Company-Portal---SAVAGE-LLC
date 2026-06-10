"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Image from 'next/image';
import { Pencil, User, Mail, Shield, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import ProfileEditForm from "@/components/ProfileEditForm";

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [isEditing, setIsEditing] = useState(true);
  const displayRoles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];

  if (isLoading) {
    return (
      <main style={{ minHeight: "calc(100vh - var(--header-height))" }} className="p-6">
        <Header title="Profile" subtitle="Manage your account" />
        <div className="mt-8">Loading...</div>
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

        <div className="mt-6 grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
          <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--card-bg)]">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name || "Profile avatar"} width={128} height={128} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[var(--muted)]">
                    {user.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>

              <div className="w-full min-w-0 flex-1 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase text-[var(--muted)]">Full Name</label>
                  <div className="mt-1 flex items-center gap-2 text-lg font-medium">
                    <User className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0 break-words">{user.name || 'No Name'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-[var(--muted)]">Email Address</label>
                  <div className="mt-1 flex items-center gap-2 text-lg font-medium">
                    <Mail className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0 break-words text-base leading-snug sm:text-lg">{user.email}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-[var(--muted)]">User ID</label>
                  <div className="mt-1 flex min-w-0 items-center gap-2 rounded bg-[var(--card-bg)] p-2 font-mono text-sm text-[var(--muted)]">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span className="truncate">{String(user.id)}</span>
                  </div>
                </div>

                {displayRoles.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-[var(--muted)]">Primary Role / Department</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayRoles.map((roleName: string, index: number) => (
                        <div key={`${roleName}-${index}`} className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-medium text-[var(--accent-foreground)]">
                          <Shield className="h-3 w-3" />
                          {roleName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="edit-profile" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-6 scroll-mt-28">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {isEditing ? "Edit Profile" : "Profile Settings"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {isEditing ? "Update your account details without opening another overlay." : "Open the editor when you need to change your profile."}
                </p>
              </div>
              {isEditing ? (
                <button
                  type="button"
                  className="motion-interactive inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-label="Close profile editor"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {isEditing ? (
              <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} onSave={() => setIsEditing(false)} />
            ) : (
              <button
                type="button"
                className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit Profile
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
