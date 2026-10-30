"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/Button";
import ProfileFormInput from "@/components/ProfileFormInput";
import UserAvatar from "@/assets/icons/UserAvatar";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import { removeAvatar, updateUserProfile, uploadAvatar } from "@/lib/api";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";
import { Camera, Calendar, Mail, MapPin, Phone, User, Shield } from "lucide-react";

export interface EditableUserProfile {
  id?: string | number;
  name?: string;
  email?: string;
  birthday?: string;
  phone?: string;
  address?: string;
  city?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
}

interface ProfileEditFormProps {
  user: EditableUserProfile | null;
  onSave?: (updatedUser: EditableUserProfile) => void;
  onCancel?: () => void;
}

type ProfileFormState = {
  name: string;
  email: string;
  birthday: string;
  phone: string;
  address: string;
  city: string;
  avatar: string;
};

type ProfileFieldId = Exclude<keyof ProfileFormState, "avatar">;

const profileFieldConfigs: Array<{
  id: ProfileFieldId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}> = [
  { id: "name", label: "Full Name", icon: User, autoComplete: "name", required: true },
  { id: "email", label: "Email Address", icon: Mail, type: "email", autoComplete: "email", inputMode: "email", required: true },
  { id: "birthday", label: "Birthday", icon: Calendar, type: "date", autoComplete: "bday" },
  { id: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "+1 (XXX) XXX-XXXX", autoComplete: "tel", inputMode: "tel", required: true },
  { id: "address", label: "Address", icon: MapPin, placeholder: "Street address", autoComplete: "street-address" },
  { id: "city", label: "City", icon: MapPin, placeholder: "City", autoComplete: "address-level2" },
];

function normalizeDateInput(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function buildProfileFormData(user: EditableUserProfile | null): ProfileFormState {
  return {
    name: user?.name || "",
    email: user?.email || "",
    birthday: normalizeDateInput(user?.birthday),
    phone: user?.phone || "+1",
    address: user?.address || "",
    city: user?.city || "",
    avatar: user?.avatar || "",
  };
}

export default function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const { showToast } = useToast();
  const { updateUser } = useUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileFormState>(() => buildProfileFormData(user));
  const [avatarPreview, setAvatarPreview] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const displayRoles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  const savedAvatar = user?.avatar || "";
  // Primitive effect keys (DESIGN.md). Remove photo saves at once and changes only the
  // avatar, so it must not reset the fields that are still being edited.
  const savedFieldsKey = JSON.stringify({ ...buildProfileFormData(user), avatar: "" });

  useEffect(() => {
    setFormData((current) => ({ ...(JSON.parse(savedFieldsKey) as ProfileFormState), avatar: current.avatar }));
    setErrors({});
  }, [savedFieldsKey]);

  useEffect(() => {
    setAvatarPreview(savedAvatar);
    setFormData((current) => ({ ...current, avatar: savedAvatar }));
  }, [savedAvatar]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.birthday && new Date(formData.birthday) > new Date()) {
      newErrors.birthday = "Birthday cannot be in the future";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: "" }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      showToast("error", `Image must be ${MAX_UPLOAD_LABEL} or smaller. Choose a smaller photo.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setFormData((current) => ({ ...current, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const clearPickedPhoto = () => {
    setAvatarPreview("");
    setFormData((current) => ({ ...current, avatar: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // A saved photo is removed on the server right away, after the inline confirm. A photo
  // that was picked but never saved is only cleared (see the Remove photo button).
  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    setIsRemovingPhoto(true);
    try {
      const response = await removeAvatar(user.id);
      clearPickedPhoto();
      updateUser(response.user);
      // Cached lists (org chart, members, concerns, tasks) carry this avatar too.
      void queryClient.invalidateQueries();
      showToast("success", "Photo removed");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not remove the photo");
    } finally {
      setIsRemovingPhoto(false);
      setConfirmingRemove(false);
    }
  };

  const resetForm = () => {
    setFormData(buildProfileFormData(user));
    setAvatarPreview(user?.avatar || "");
    setErrors({});
    onCancel?.();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      showToast("error", "Please fix the errors before saving");
      return;
    }

    if (!user?.id) {
      showToast("error", "User ID not found");
      return;
    }

    setIsSubmitting(true);

    try {
      // Remove photo saves on its own (DELETE /users/:id/avatar); Save only uploads a newly picked photo.
      const shouldUploadAvatar = Boolean(formData.avatar) && formData.avatar !== (user.avatar || "");
      const profileResponse = await updateUserProfile(user.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        // Optional fields: an empty value clears the field instead of storing "".
        birthday: formData.birthday || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
      });

      let finalUser = {
        ...user,
        ...formData,
        ...profileResponse.user,
      };

      if (shouldUploadAvatar) {
        const avatarResponse = await uploadAvatar(user.id, formData.avatar);
        finalUser = {
          ...finalUser,
          ...avatarResponse.user,
        };
      }

      updateUser(finalUser);
      onSave?.(finalUser);
      showToast("success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("error", error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center border-b border-[var(--border)] pb-5">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--card-surface)]">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <UserAvatar className="h-full w-full" size={96} ariaHidden={true} />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            aria-label="Change profile picture"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile picture"
        />
        {confirmingRemove ? (
          <div key="confirm-remove" role="group" aria-label="Remove photo" className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--foreground)]">
            <span>Remove your photo?</span>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={(event) => {
                // A double-click on the Remove photo trigger lands its second click here: ignore it.
                if (event.detail > 1) return;
                void handleRemovePhoto();
              }}
              loading={isRemovingPhoto}
              disabled={isSubmitting}
            >
              Remove photo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemove(false)} disabled={isRemovingPhoto} autoFocus>
              Keep photo
            </Button>
          </div>
        ) : (
          <div key="photo-actions" className="mt-3 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Upload photo
            </Button>
            {avatarPreview ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={savedAvatar ? () => setConfirmingRemove(true) : clearPickedPhoto}
                disabled={isSubmitting}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">JPG, PNG or GIF. Max size {MAX_UPLOAD_LABEL}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {profileFieldConfigs.map((field) => (
          <ProfileFormInput
            key={field.id}
            {...field}
            value={formData[field.id]}
            onChange={(value) => handleChange(field.id, value)}
            error={errors[field.id]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--border)] pt-5">
        <div>
          <label className="text-xs font-semibold uppercase text-[var(--muted)]">User ID</label>
          <div className="mt-1 flex min-w-0 items-center gap-2 rounded bg-[var(--card-bg)] p-2.5 font-mono text-sm text-[var(--muted)] border border-[var(--border)]">
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate">{String(user?.id)}</span>
          </div>
        </div>

        {displayRoles.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">Primary Role / Department</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {displayRoles.map((roleName: string, index: number) => (
                <div key={`${roleName}-${index}`} className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-medium text-[var(--accent-foreground)] font-medium">
                  <Shield className="h-3 w-3" />
                  {roleName}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" onClick={resetForm} disabled={isSubmitting || isRemovingPhoto}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={isSubmitting} disabled={isSubmitting || isRemovingPhoto}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
