"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { User, Mail, Calendar, Phone, Camera, MapPin, Flag } from "lucide-react";
import { useToast } from "./ToastProvider";
import { useUser } from "@/contexts/UserContext";
import { updateUserProfile, uploadAvatar } from "@/lib/api";
import UserAvatar from "@/assets/icons/UserAvatar";

interface UserProfile {
  id?: string;
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
  const { updateUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    birthday: "",
    phone: "",
    address: "",
    city: "",
    citizenship: "",
    avatar: "",
    department: "",
    role: "",
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch('/api/departments').then(r => r.json()),
          fetch('/api/roles').then(r => r.json())
        ]);
        setDepartments(Array.isArray(deptRes) ? deptRes : []);
        setRoles(Array.isArray(roleRes) ? roleRes : []);
      } catch (e) {
        console.error('Failed to load profile options', e);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        birthday: user.birthday || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        citizenship: user.citizenship || "",
        avatar: user.avatar || "",
        department: (user as any).department || "",
        role: (user as any).role || "",
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

    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    } else {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthday = "Birthday cannot be in the future";
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.citizenship.trim()) {
      newErrors.citizenship = "Citizenship is required";
    }

    if (!formData.department) {
      newErrors.department = "Department is required";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
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

    if (!user?.id) {
      showToast('error', "User ID not found");
      return;
    }

    setIsSubmitting(true);

    try {
      // Separate avatar upload from profile update
      const hasAvatarChanged = formData.avatar && formData.avatar !== user.avatar;

      // Update profile data (without avatar)
      const profileData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        birthday: formData.birthday,
        address: formData.address,
        city: formData.city,
        citizenship: formData.citizenship,
        department: formData.department,
        position: formData.role, // Mapping role to position for compatibility
      };

      // Call API to update profile
      const profileResponse = await updateUserProfile(user.id, profileData);

      let finalUser = profileResponse.user;

      // If avatar changed, upload it separately
      if (hasAvatarChanged) {
        const avatarResponse = await uploadAvatar(user.id, formData.avatar);
        finalUser = avatarResponse.user;
      }

      // Update UserContext with new data
      updateUser(finalUser);

      // Call parent onSave callback
      onSave(finalUser);

      showToast('success', "Profile updated successfully!");
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('error', "Failed to update profile. Please try again.");
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
              Full Name <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="Enter your full name"
            required
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
              Email Address <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.email
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="your.email@savage.com"
            required
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
              Birthday <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="birthday"
            type="date"
            value={formData.birthday}
            onChange={(e) => handleChange("birthday", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.birthday
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            required
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
              Phone Number <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.phone
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="+63 XXX XXX XXXX"
            required
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* Address Field */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.address
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="Street address"
            required
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-500">{errors.address}</p>
          )}
        </div>

        {/* City Field */}
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              City <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.city
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="City"
            required
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-500">{errors.city}</p>
          )}
        </div>

        {/* Citizenship Field */}
        <div>
          <label
            htmlFor="citizenship"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Citizenship <span className="text-red-500">*</span>
            </div>
          </label>
          <input
            id="citizenship"
            type="text"
            value={formData.citizenship}
            onChange={(e) => handleChange("citizenship", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border ${errors.citizenship
              ? "border-red-500 focus:ring-red-500"
              : "border-[var(--border)] focus:ring-[var(--accent)]"
              } bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2`}
            placeholder="Country"
            required
          />
          {errors.citizenship && (
            <p className="mt-1 text-sm text-red-500">{errors.citizenship}</p>
          )}
        </div>

        {/* Department & Role Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => handleChange("department", e.target.value)}
              className={`w-full px-3 py-2 rounded-md border ${errors.department ? "border-red-500" : "border-[var(--border)]"} bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]`}
              required
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-red-500">{errors.department}</p>
            )}
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Primary Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className={`w-full px-3 py-2 rounded-md border ${errors.role ? "border-red-500" : "border-[var(--border)]"} bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]`}
              required
            >
              <option value="">Select Role</option>
              {roles.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-500">{errors.role}</p>
            )}
          </div>
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
