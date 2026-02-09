/**
 * Announcements Storage Library
 * Manages company announcements, shoutouts, events, and birthdays with localStorage persistence
 */

import { getItem, setItem } from './storage';

export type AnnouncementCategory = 'company-news' | 'shoutouts' | 'events' | 'birthdays';

export interface EventDetails {
  date: string;
  location: string;
  going: string[]; // Array of user IDs who marked "going"
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  category: AnnouncementCategory;
  author: string;
  timestamp: string;
  title: string;
  body: string;
  likes: string[]; // Array of user IDs who liked
  comments: Comment[];
  eventDetails?: EventDetails;
  birthdayDate?: string; // Date string for birthday announcements
  isImportant: boolean;
}

const STORAGE_KEY = 'company_announcements';

/**
 * Load all announcements from localStorage
 * Ensures backward compatibility by adding isImportant field to older announcements
 */
export function loadAnnouncements(): Announcement[] {
  const announcements = getItem<Announcement[]>(STORAGE_KEY, []);
  
  // Ensure backward compatibility: add isImportant field if missing
  return announcements.map(announcement => ({
    ...announcement,
    isImportant: announcement.isImportant ?? false,
  }));
}

/**
 * Save announcements to localStorage
 */
export function saveAnnouncements(announcements: Announcement[]): void {
  setItem(STORAGE_KEY, announcements);
}

/**
 * Add a new announcement
 */
export function addAnnouncement(
  category: AnnouncementCategory,
  title: string,
  body: string,
  author: string = 'User',
  eventDetails?: EventDetails,
  isImportant: boolean = false,
  birthdayDate?: string
): Announcement {
  const announcements = loadAnnouncements();
  const newAnnouncement: Announcement = {
    id: `ann-${Date.now()}`,
    category,
    author,
    timestamp: new Date().toISOString(),
    title,
    body,
    likes: [],
    comments: [],
    eventDetails,
    birthdayDate,
    isImportant,
  };
  
  announcements.unshift(newAnnouncement); // Add to beginning
  saveAnnouncements(announcements);
  return newAnnouncement;
}

/**
 * Update an existing announcement
 */
export function updateAnnouncement(id: string, updates: Partial<Omit<Announcement, 'id'>>): void {
  const announcements = loadAnnouncements();
  const index = announcements.findIndex(a => a.id === id);
  
  if (index !== -1) {
    announcements[index] = { ...announcements[index], ...updates };
    saveAnnouncements(announcements);
  }
}

/**
 * Delete an announcement
 */
export function deleteAnnouncement(id: string): void {
  const announcements = loadAnnouncements();
  const filtered = announcements.filter(a => a.id !== id);
  saveAnnouncements(filtered);
}

/**
 * Toggle like on an announcement
 */
export function toggleLike(announcementId: string, userId: string = 'current-user'): void {
  const announcements = loadAnnouncements();
  const announcement = announcements.find(a => a.id === announcementId);
  
  if (announcement) {
    const likeIndex = announcement.likes.indexOf(userId);
    if (likeIndex === -1) {
      announcement.likes.push(userId);
    } else {
      announcement.likes.splice(likeIndex, 1);
    }
    saveAnnouncements(announcements);
  }
}

/**
 * Add a comment to an announcement
 */
export function addComment(
  announcementId: string,
  text: string,
  author: string = 'User'
): void {
  const announcements = loadAnnouncements();
  const announcement = announcements.find(a => a.id === announcementId);
  
  if (announcement) {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author,
      text,
      timestamp: new Date().toISOString(),
    };
    announcement.comments.push(newComment);
    saveAnnouncements(announcements);
  }
}

/**
 * Delete a comment from an announcement
 */
export function deleteComment(announcementId: string, commentId: string): void {
  const announcements = loadAnnouncements();
  const announcement = announcements.find(a => a.id === announcementId);
  
  if (announcement) {
    announcement.comments = announcement.comments.filter(c => c.id !== commentId);
    saveAnnouncements(announcements);
  }
}

/**
 * Toggle "going" status for an event
 */
export function toggleGoing(announcementId: string, userId: string = 'current-user'): void {
  const announcements = loadAnnouncements();
  const announcement = announcements.find(a => a.id === announcementId);
  
  if (announcement?.eventDetails) {
    const goingIndex = announcement.eventDetails.going.indexOf(userId);
    if (goingIndex === -1) {
      announcement.eventDetails.going.push(userId);
    } else {
      announcement.eventDetails.going.splice(goingIndex, 1);
    }
    saveAnnouncements(announcements);
  }
}

/**
 * Get announcements by category
 */
export function getAnnouncementsByCategory(category: AnnouncementCategory): Announcement[] {
  return loadAnnouncements().filter(a => a.category === category);
}

/**
 * Get recent announcements (last N)
 * Important announcements are prioritized and shown first
 */
export function getRecentAnnouncements(count: number = 3): Announcement[] {
  const announcements = loadAnnouncements();
  // Sort: important first, then by timestamp
  const sorted = [...announcements].sort((a, b) => {
    if (a.isImportant && !b.isImportant) return -1;
    if (!a.isImportant && b.isImportant) return 1;
    return 0; // Maintain original order for same importance level
  });
  return sorted.slice(0, count);
}

/**
 * Format timestamp to "X time ago" format
 */
export function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return past.toLocaleDateString();
}
