"use client";

import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import { Send, AlertCircle } from "lucide-react";
import type { AnnouncementCategory as Category } from "@/lib/announcements";

interface AnnouncementFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  category: Category;
  setCategory: (v: Category) => void;
  title: string;
  setTitle: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  isEvent: boolean;
  setIsEvent: (v: boolean) => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  eventLocation: string;
  setEventLocation: (v: string) => void;
  isBirthday: boolean;
  setIsBirthday: (v: boolean) => void;
  birthdayDate: string;
  setBirthdayDate: (v: string) => void;
  isImportant: boolean;
  setIsImportant: (v: boolean) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function AnnouncementFormModal({
  isOpen,
  isEditing,
  category,
  setCategory,
  title,
  setTitle,
  body,
  setBody,
  isEvent,
  setIsEvent,
  eventDate,
  setEventDate,
  eventLocation,
  setEventLocation,
  isBirthday,
  setIsBirthday,
  birthdayDate,
  setBirthdayDate,
  isImportant,
  setIsImportant,
  onSubmit,
  onClose,
}: AnnouncementFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Announcement" : "Create New Announcement"}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category);
              setIsEvent(e.target.value === "events");
              setIsBirthday(e.target.value === "birthdays");
            }}
            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
            aria-label="Category"
          >
            <option value="company-news">Company News</option>
            <option value="shoutouts">Shoutouts</option>
            <option value="events">Events</option>
            <option value="birthdays">Birthdays</option>
          </select>
        </div>

        <FormField
          id="announcement-title"
          label="Title"
          type="text"
          value={title}
          onChange={setTitle}
          placeholder="Enter announcement title..."
          required
        />

        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement..."
            rows={4}
            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isImportant"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]"
          />
          <label
            htmlFor="isImportant"
            className="text-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Mark as Important (will be pinned on dashboard)
          </label>
        </div>

        {isEvent && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Event Date & Time</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert-[1] dark:[&::-webkit-calendar-picker-indicator]:brightness-[1.5]"
                aria-label="Event date and time"
              />
            </div>

            <FormField
              id="event-location"
              label="Location"
              type="text"
              value={eventLocation}
              onChange={setEventLocation}
              placeholder="e.g., Main Conference Room"
            />
          </>
        )}

        {isBirthday && (
          <div>
            <label className="block text-sm font-medium mb-2">Birthday Date</label>
            <input
              type="date"
              value={birthdayDate}
              onChange={(e) => setBirthdayDate(e.target.value)}
              className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert-[1] dark:[&::-webkit-calendar-picker-indicator]:brightness-[1.5]"
              aria-label="Birthday date"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!title.trim() || !body.trim()}
            variant="success"
            icon={<Send className="w-4 h-4" />}
          >
            {isEditing ? "Update Announcement" : "Post Announcement"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
