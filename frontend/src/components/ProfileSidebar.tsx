"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, User, LogOut, Edit2 } from "lucide-react";
import { getCurrentUser } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import UserAvatar from "@/assets/icons/UserAvatar";
import Button from "./Button";
import EditProfileModal from "./EditProfileModal";

interface UserProfile {
  id?: string;
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
  const [showEditModal, setShowEditModal] = useState(false);

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

  const handleSaveProfile = (updatedUser: UserProfile) => {
    setUser(updatedUser);
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        style={{ zIndex: 9998 }}
      />

      {/* Slide-in sidebar from right */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-[var(--card-bg)] shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          borderLeft: "1px solid var(--border)",
          zIndex: 10000,
          isolation: 'isolate'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--card-surface)] transition-colors"
            aria-label="Close profile"
          >
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex flex-col items-center p-8 space-y-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--card-surface)] border-4 border-[var(--border)] shadow-lg">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserAvatar className="w-full h-full" size={128} ariaHidden={true} />
              )}
            </div>
          </div>

          {/* User Name */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              {user?.name || "User"}
            </h3>
            {user?.roles && user.roles.length > 0 && (
              <p className="text-sm font-medium text-[var(--accent)] mb-1">
                {user.roles.join(", ")}
              </p>
            )}
            <p className="text-sm text-[var(--muted)]">{user?.email || ""}</p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-4">
            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowEditModal(true)}
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>

            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Additional Info (Optional) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)] bg-[var(--card-surface)]">
          <div className="text-xs text-[var(--muted)] space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              <span>User ID: {user?.id?.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleSaveProfile}
      />
    </>
  );
}
