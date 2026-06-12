"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import ProfileFormInput from "@/components/ProfileFormInput";
import UserAvatar from "@/assets/icons/UserAvatar";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import { updateUserProfile, uploadAvatar } from "@/lib/api";
import { Camera, Calendar, Mail, MapPin, Phone, User } from "lucide-react";

export interface EditableUserProfile {
  id?: string | number;
  name?: string;
  email?: string;
  birthday?: string;
  phone?: string;
  address?: string;
  city?: string;
  avatar?: string;
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
  { id: "birthday", label: "Birthday", icon: Calendar, type: "date", autoComplete: "bday", required: true },
  { id: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "+1 (XXX) XXX-XXXX", autoComplete: "tel", inputMode: "tel", required: true },
  { id: "address", label: "Address", icon: MapPin, placeholder: "Street address", autoComplete: "street-address", required: true },
  { id: "city", label: "City", icon: MapPin, placeholder: "City", autoComplete: "address-level2", required: true },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileFormState>(() => buildProfileFormData(user));
  const [avatarPreview, setAvatarPreview] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(buildProfileFormData(user));
    setAvatarPreview(user?.avatar || "");
    setErrors({});
  }, [user]);

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

    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    } else if (new Date(formData.birthday) > new Date()) {
      newErrors.birthday = "Birthday cannot be in the future";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
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

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image size must be less than 5MB");
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

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    setFormData((current) => ({ ...current, avatar: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      const hasAvatarChanged = formData.avatar !== (user.avatar || "");
      const shouldUploadAvatar = hasAvatarChanged && Boolean(formData.avatar);
      const shouldClearAvatar = hasAvatarChanged && !formData.avatar;
      const profileResponse = await updateUserProfile(user.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        birthday: formData.birthday,
        address: formData.address,
        city: formData.city,
        ...(shouldClearAvatar ? { avatar: "" } : {}),
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
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Upload Photo
          </Button>
          {avatarPreview ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">JPG, PNG or GIF. Max size 5MB.</p>
      </div>

      {profileFieldConfigs.map((field) => (
        <ProfileFormInput
          key={field.id}
          {...field}
          value={formData[field.id]}
          onChange={(value) => handleChange(field.id, value)}
          error={errors[field.id]}
        />
      ))}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={isSubmitting} disabled={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
