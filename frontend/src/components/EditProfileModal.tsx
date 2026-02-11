"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { User, Mail, Calendar, Phone, Camera } from "lucide-react";
import { useToast } from "./ToastProvider";
import UserAvatar from "@/assets/icons/UserAvatar";

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  birthday?: string;
  phone?: string;
  roles?: string[];
  avatar?: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (updatedUser: UserProfile) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onSave,
}: EditProfileModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    birthday: "",
    phone: "",
    avatar: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        birthday: user.birthday || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
      });
      setAvatarPreview(user.avatar || "");
      setErrors({});
    }
  }, [isOpen, user]);

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

    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthday = "Birthday cannot be in the future";
      }
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', "Please fix the errors before saving");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Call API to update profile
      // await updateUserProfile(user.id, formData);

      // For now, just update localStorage
      const updatedUser = { ...user, ...formData };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      onSave(updatedUser);
      showToast('success', "Profile updated successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      showToast('error', "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast('error', "Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', "Image size must be less than 5MB");
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setFormData((prev) => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    setFormData((prev) => ({ ...prev, avatar: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Picture */}
        <div className="flex flex-col items-center pb-4 border-b border-[var(--border)]">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--card-surface)] border-2 border-[var(--border)]">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserAvatar className="w-full h-full" size={96} ariaHidden={true} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-lg"
              aria-label="Change profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Photo
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] mt-2">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>

        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </div>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              errors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-[var(--border)] focus:ring-[var(--accent)]"
            } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </div>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              errors.email
                ? "border-red-500 focus:ring-red-500"
                : "border-[var(--border)] focus:ring-[var(--accent)]"
            } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="your.email@savage.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Birthday Field */}
        <div>
          <label
            htmlFor="birthday"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Birthday
            </div>
          </label>
          <input
            id="birthday"
            type="date"
            value={formData.birthday}
            onChange={(e) => handleChange("birthday", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              errors.birthday
                ? "border-red-500 focus:ring-red-500"
                : "border-[var(--border)] focus:ring-[var(--accent)]"
            } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
          />
          {errors.birthday && (
            <p className="mt-1 text-sm text-red-500">{errors.birthday}</p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </div>
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${
              errors.phone
                ? "border-red-500 focus:ring-red-500"
                : "border-[var(--border)] focus:ring-[var(--accent)]"
            } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="+63 XXX XXX XXXX"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
