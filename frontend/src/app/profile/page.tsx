"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { apiFetch } from "@/lib/api";
import Image from 'next/image';
import { User, Mail, Shield } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles?: string[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const toast = useToast();

  async function loadData() {
    try {
      const res = await apiFetch('/auth/me'); // AuthController exposes /me
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!user) {
    return (
      <main style={{ minHeight: "calc(100vh - var(--header-height))" }} className="p-6">
        <Header title="Profile" subtitle="Manage your account" />
        <div className="mt-8">Loading...</div>
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

        <div className="mt-6 max-w-2xl">
          <div className="p-6 rounded-lg border bg-[var(--card-surface)] flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--card-bg)] border-2 border-[var(--border)] shrink-0">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name} width={128} height={128} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[var(--muted)]">
                  {user.name?.charAt(0) || '?'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="text-xs text-[var(--muted)] uppercase font-semibold">Full Name</label>
                <div className="flex items-center gap-2 mt-1 font-medium text-lg">
                  <User className="w-5 h-5 text-[var(--muted)]" />
                  {user.name || 'No Name'}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] uppercase font-semibold">Email Address</label>
                <div className="flex items-center gap-2 mt-1 font-medium text-lg">
                  <Mail className="w-5 h-5 text-[var(--muted)]" />
                  {user.email}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] uppercase font-semibold">User ID</label>
                <div className="flex items-center gap-2 mt-1 font-mono text-sm text-[var(--muted)] bg-[var(--card-bg)] p-2 rounded">
                  <Shield className="w-4 h-4" />
                  {user.id}
                </div>
              </div>

              {user.roles && user.roles.length > 0 && (
                <div>
                  <label className="text-xs text-[var(--muted)] uppercase font-semibold">Primary Role / Department</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles.map((r: string, idx: number) => (
                      <div key={idx} className="px-3 py-1 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
