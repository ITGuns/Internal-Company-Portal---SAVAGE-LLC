"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
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

  useEffect(() => {
    if (!isOpen) return;
    
    const currentUser = getCurrentUser();
    // Fallback to mock user for development
    const userData = currentUser || {
      name: "User",
      email: "user@SVGLLC.com",
      roles: ["Frontend Developer"]
    };
    setUser(userData);
  }, [isOpen]);

  const handleEditProfile = () => {
    onClose();
    router.push("/profile#edit-profile");
  };

  const handleSignOut = () => {
    // Clear auth data
    logout();
    // Close the sidebar
    onClose();
    // Redirect to login page
    router.push('/login');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm motion-fade-in"
        onClick={onClose}
        style={{ zIndex: 9998 }}
      />

      {/* Slide-in sidebar from right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-sidebar-title"
        className="fixed right-0 top-0 flex h-[100dvh] w-96 max-w-[calc(100vw-1rem)] flex-col overflow-hidden bg-[var(--surface-raised)] text-[var(--foreground)] shadow-2xl motion-drawer-right-in"
        style={{
          borderLeft: "1px solid var(--border)",
          zIndex: 10000,
          isolation: 'isolate'
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
          <h2 id="profile-sidebar-title" className="text-lg font-semibold text-[var(--foreground)]">Profile</h2>
          <button
            onClick={onClose}
            className="motion-interactive rounded-md p-2 hover:bg-[var(--card-surface)]"
            aria-label="Close profile"
          >
            <X className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="sidebar-scroll flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
          {/* Avatar */}
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
                <UserAvatar className="w-full h-full" size={128} ariaHidden={true} />
              )}
            </div>
          </div>

          {/* User Name */}
          <div className="mt-6 w-full min-w-0 text-center">
            <h3 className="break-words text-xl font-bold leading-tight text-[var(--foreground)] sm:text-2xl">
              {user?.name || "User"}
            </h3>
            {user?.roles && user.roles.length > 0 && (
              <p className="mt-2 break-words text-sm font-medium text-[var(--accent)]">
                {user.roles.join(", ")}
              </p>
            )}
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{user?.email || ""}</p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 w-full space-y-3">
            <Button
              variant="primary"
              className="flex w-full items-center justify-center gap-2"
              onClick={handleEditProfile}
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>

            <Button
              variant="secondary"
              className="flex w-full items-center justify-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Additional Info (Optional) */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card-surface)] p-4">
          <div className="text-xs text-[var(--muted)] space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">User ID: {String(user?.id ?? "").slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
