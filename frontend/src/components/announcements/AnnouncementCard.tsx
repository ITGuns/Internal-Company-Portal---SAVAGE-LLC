"use client";

import React from "react";
import Card from "@/components/Card";
import {
  Calendar,
  Cake,
  Heart,
  MessageCircle,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  getTimeAgo,
  type Announcement,
} from "@/lib/announcements";
import { formatDate } from "@/lib/date-utils";

interface AnnouncementCardProps {
  announcement: Announcement;
  categoryIcon: React.ElementType;
  liked: boolean;
  going: boolean;
  showingComments: boolean;
  menuOpen: boolean;
  commentText: string;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLike: () => void;
  onToggleGoing: () => void;
  onToggleComments: () => void;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
}

function formatEventDateTime(dateTimeString: string): string {
  if (!dateTimeString) return "";
  const date = new Date(dateTimeString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleDateString("en-US", options);
}

function formatBirthdayDate(dateString: string): string {
  if (!dateString) return "";
  return formatDate(dateString, { month: "long", day: "numeric", year: "numeric" });
}

export default function AnnouncementCard({
  announcement,
  categoryIcon: IconComponent,
  liked,
  going,
  showingComments,
  menuOpen,
  commentText,
  onToggleMenu,
  onEdit,
  onDelete,
  onToggleLike,
  onToggleGoing,
  onToggleComments,
  onCommentTextChange,
  onAddComment,
}: AnnouncementCardProps) {
  return (
    <Card variant="outlined" padding="lg" className="hover:shadow-sm transition">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--card-surface)] flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-[var(--muted)]" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="font-medium">{announcement.author}</span>
              <span>·</span>
              <span>{getTimeAgo(announcement.timestamp)}</span>
            </div>

            <div className="flex items-center gap-2">
              {announcement.isImportant && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  IMPORTANT
                </span>
              )}

              <div className="relative">
                <button
                  onClick={onToggleMenu}
                  className="p-1 rounded hover:bg-[var(--card-surface)] transition"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4 text-[var(--muted)]" />
                </button>

                {menuOpen && (
                  <div className="menu-container absolute right-0 top-8 z-10 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                    <button
                      onClick={onEdit}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--card-surface)] transition flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={onDelete}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--card-surface)] transition flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{announcement.title}</h3>
            {announcement.isImportant && (
              <AlertCircle className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-[var(--foreground)] mb-4 whitespace-pre-wrap">
            {announcement.body}
          </p>

          {announcement.eventDetails && (
            <div className="mb-4 p-3 bg-[var(--card-surface)] rounded border border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)] mb-1">
                <Calendar className="w-4 h-4" />
                {formatEventDateTime(announcement.eventDetails.date)}
              </div>
              <div className="text-sm text-[var(--muted)] ml-6 mb-2">
                📍 {announcement.eventDetails.location}
              </div>
              <div className="flex items-center gap-3 ml-6">
                <button
                  onClick={onToggleGoing}
                  className={`text-sm px-3 py-1 rounded transition ${
                    going
                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-surface)]"
                  }`}
                >
                  {going ? "✅ Going" : "Mark as Going"}
                </button>
                <span className="text-sm text-[var(--muted)]">
                  {announcement.eventDetails.going.length}{" "}
                  {announcement.eventDetails.going.length === 1 ? "person" : "people"} going
                </span>
              </div>
              {announcement.eventDetails.goingNames.length > 0 && (
                <div className="ml-6 mt-2 text-xs text-[var(--muted)]">
                  {announcement.eventDetails.goingNames.slice(0, 5).join(', ')}
                  {announcement.eventDetails.goingNames.length > 5 && (
                    <> and {announcement.eventDetails.goingNames.length - 5} more</>
                  )}
                </div>
              )}
            </div>
          )}

          {announcement.birthdayDate && (
            <div className="mb-4 p-3 bg-[var(--card-surface)] rounded border border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Cake className="w-4 h-4" />
                🎂 Birthday: {formatBirthdayDate(announcement.birthdayDate)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-3">
            <button
              onClick={onToggleLike}
              className={`flex items-center gap-1 transition ${
                liked ? "text-red-500" : "hover:text-[var(--foreground)]"
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span>
                {announcement.likes.length}{" "}
                {announcement.likes.length === 1 ? "like" : "likes"}
              </span>
            </button>
            <button
              onClick={onToggleComments}
              className="flex items-center gap-1 hover:text-[var(--foreground)] transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {announcement.comments.length}{" "}
                {announcement.comments.length === 1 ? "comment" : "comments"}
              </span>
            </button>
          </div>

          {showingComments && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="space-y-3 mb-4">
                {announcement.comments.length === 0 ? (
                  <div className="text-sm text-[var(--muted)] text-center py-2">
                    No comments yet
                  </div>
                ) : (
                  announcement.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--card-surface)] flex items-center justify-center flex-shrink-0 text-xs font-medium">
                        {comment.author.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1">
                          <span className="font-medium">{comment.author}</span>
                          <span>·</span>
                          <span>{getTimeAgo(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-[var(--foreground)]">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => onCommentTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onAddComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm"
                />
                <button
                  onClick={onAddComment}
                  className="p-2 rounded bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition"
                  aria-label="Post comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
