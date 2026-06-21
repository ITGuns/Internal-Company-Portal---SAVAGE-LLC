"use client";

import Modal from "./Modal";
import ProfileEditForm, { type EditableUserProfile } from "./ProfileEditForm";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: EditableUserProfile | null;
  onSave: (updatedUser: EditableUserProfile) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onSave,
}: EditProfileModalProps) {
  const handleSave = (updatedUser: EditableUserProfile) => {
    onSave(updatedUser);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <ProfileEditForm user={user} onSave={handleSave} onCancel={onClose} />
    </Modal>
  );
}
