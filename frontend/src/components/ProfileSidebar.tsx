"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X, User, LogOut, Edit2 } from "lucide-react";
import { getCurrentUser } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import UserAvatar from "@/assets/icons/UserAvatar";
import Button from "./Button";

interface UserProfile {
  id?: string | number;
  name: string;
  email: string;
  birthday?: string;
  phone?: string;
  address?: string;
  city?: string;
  citizenship?: string;
  roles?: string[];
  avatar?: string;
}

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const router = useRouter();
  const { logout } = useUser();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setUser(getCurrentUser());
  }, [isOpen]);

  const handleEditProfile = () => {
    onClose();
    router.push("/profile#edit-profile");
  };

  const handleSignOut = () => {
    logout();
    onClose();
    router.push("/login");
  };

  if (!isOpen || !isMounted) return null;

  const userIdLabel = user?.id ? `${String(user.id).slice(0, 8)}...` : "Unavailable";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9997] bg-black/30 backdrop-blur-sm motion-fade-in"
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 z-[9998] flex h-[100dvh] w-full max-w-sm flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] shadow-2xl motion-drawer-right-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-sidebar-title"
        style={{
          isolation: "isolate",
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
          <h2 id="profile-sidebar-title" className="text-lg font-semibold text-[var(--foreground)]">
            Profile
          </h2>
          <button
            onClick={onClose}
            className="motion-interactive rounded-md p-2 hover:bg-[var(--card-surface)]"
            aria-label="Close profile"
          >
            <X className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="flex flex-col items-center space-y-5">
            <div className="relative shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--border)] bg-[var(--card-surface)] shadow-lg sm:h-32 sm:w-32">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name || "User"}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserAvatar className="h-full w-full" size={128} ariaHidden={true} />
                )}
              </div>
            </div>

            <div className="w-full min-w-0 text-center">
              <h3 className="break-words text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
                {user?.name || "User"}
              </h3>
              {user?.roles && user.roles.length > 0 ? (
                <p className="mt-2 break-words text-sm font-medium text-[var(--accent)]">
                  {user.roles.join(", ")}
                </p>
              ) : null}
              <p className="mt-1 break-all text-sm text-[var(--muted)]">{user?.email || ""}</p>
            </div>

            <div className="w-full space-y-3 pt-2">
              <Button variant="primary" fullWidth onClick={handleEditProfile}>
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </Button>

              <Button variant="secondary" fullWidth onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card-surface)] p-4">
          <div className="space-y-1 text-xs text-[var(--muted)]">
            <div className="flex min-w-0 items-center gap-2">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">User ID: {userIdLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
