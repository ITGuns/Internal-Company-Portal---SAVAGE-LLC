/**
 * Announcements Library
 * Manages company announcements via Backend API
 */

import { apiFetch } from './api';
import type { ApiAnnouncement, ApiAnnouncementLike, ApiAnnouncementComment, ApiAnnouncementRsvp } from './types/api';
import type { PaginatedResponse } from './types/pagination';

export type AnnouncementCategory = 'company-news' | 'shoutouts' | 'events' | 'birthdays';

export interface EventDetails {
  date: string;
  location: string;
  going: string[]; // Array of user IDs who marked "going"
  goingNames: string[]; // Array of user names who marked "going"
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
  birthdayDate?: string;
  isImportant: boolean;
  priority?: string;
}

// Helper to map API data to Frontend interface
const mapApiAnnouncement = (data: ApiAnnouncement): Announcement => {
  return {
    id: data.id,
    category: data.category as AnnouncementCategory,
    author: data.author?.name || 'Unknown',
    timestamp: data.createdAt,
    title: data.title,
    body: data.content,
    likes: data.likes?.map((l: ApiAnnouncementLike) => l.userId) || [],
    comments: data.comments?.map((c: ApiAnnouncementComment) => ({
      id: c.id,
      author: c.author?.name || 'Unknown',
      text: c.text,
      timestamp: c.createdAt
    })) || [],
    eventDetails: data.category === 'events' ? {
      date: data.eventDate || '',
      location: data.eventLocation || '',
      going: data.rsvps?.filter((r: ApiAnnouncementRsvp) => r.status === 'going').map((r: ApiAnnouncementRsvp) => r.userId) || [],
      goingNames: data.rsvps?.filter((r: ApiAnnouncementRsvp) => r.status === 'going').map((r: ApiAnnouncementRsvp) => r.user?.name || 'Unknown') || []
    } : undefined,
    birthdayDate: data.birthdayDate,
    isImportant: data.isImportant,
    priority: data.priority
  };
};

/**
 * Fetch all announcements from API
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await apiFetch('/announcements');
    if (res.status === 200) {
      const data = await res.json();
      return data.map(mapApiAnnouncement);
    }
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
  }
  return [];
}

/**
 * Fetch announcements with pagination
 */
export async function fetchAnnouncementsPaginated(page: number, limit: number): Promise<PaginatedResponse<Announcement>> {
  try {
    const res = await apiFetch(`/announcements?page=${page}&limit=${limit}`);
    if (res.status === 200) {
      const json = await res.json();
      return {
        ...json,
        data: json.data.map(mapApiAnnouncement),
      };
    }
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
  }
  return { data: [], total: 0, page, limit, totalPages: 0 };
}

/**
 * Add a new announcement
 */
export async function addAnnouncement(
  category: AnnouncementCategory,
  title: string,
  body: string,
  _author: string = 'User', // Author is handled by backend token
  eventDetails?: EventDetails,
  isImportant: boolean = false,
  birthdayDate?: string
): Promise<Announcement | null> {
  try {
    const payload: Record<string, unknown> = {
      category,
      title,
      content: body, // Map body to content
      isImportant,
    };

    if (category === 'events' && eventDetails) {
      payload.eventDate = eventDetails.date;
      payload.eventLocation = eventDetails.location;
    }

    if (category === 'birthdays' && birthdayDate) {
      payload.birthdayDate = birthdayDate;
    }

    const res = await apiFetch('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      const data = await res.json();
      return mapApiAnnouncement(data);
    }
  } catch (error) {
    console.error('Failed to create announcement:', error);
  }
  return null;
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(id: string, updates: Partial<Omit<Announcement, 'id'>>): Promise<Announcement | null> {
  try {
    const payload: Record<string, unknown> = {};
    if (updates.category) payload.category = updates.category;
    if (updates.title) payload.title = updates.title;
    if (updates.body) payload.content = updates.body;
    if (updates.isImportant !== undefined) payload.isImportant = updates.isImportant;
    if (updates.eventDetails) {
      payload.eventDate = updates.eventDetails.date;
      payload.eventLocation = updates.eventDetails.location;
    }
    if (updates.birthdayDate) payload.birthdayDate = updates.birthdayDate;

    const res = await apiFetch(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (res.status === 200) {
      const data = await res.json();
      return mapApiAnnouncement(data);
    }
  } catch (error) {
    console.error('Failed to update announcement:', error);
  }
  return null;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/announcements/${id}`, {
      method: 'DELETE',
    });
    return res.status === 200;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return false;
  }
}

/**
 * Toggle like on an announcement
 */
export async function toggleLike(announcementId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/announcements/${announcementId}/like`, {
      method: 'POST',
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.liked;
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
  return false;
}

/**
 * Add a comment to an announcement
 */
export async function addComment(
  announcementId: string,
  text: string,
  _author: string = 'User'
): Promise<Comment | null> {
  try {
    const res = await apiFetch(`/announcements/${announcementId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    if (res.status === 201) {
      const data = await res.json();
      return {
        id: data.id,
        author: data.author?.name || 'Unknown',
        text: data.text,
        timestamp: data.createdAt
      };
    }
  } catch (error) {
    console.error('Failed to add comment:', error);
  }
  return null;
}

/**
 * Delete a comment from an announcement
 */
export async function deleteComment(announcementId: string, commentId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/announcements/${announcementId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    return res.status === 200;
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return false;
  }
}

/**
 * Toggle "going" status for an event (RSVP)
 */
export async function toggleGoing(announcementId: string): Promise<boolean> {
  try {
    // Determine current status. API expects 'going', 'maybe', 'not-going' or null.
    // For simple toggle, we assume we want to toggle 'going'.
    // However, the API endpoint is POST /rsvp with { status: 'going' }
    // If already going, sending it again might toggle it or we might need logic.
    // The previous backend implementation of toggleRSVP: if exists -> delete, else -> create.
    // So sending 'going' acts as a toggle if we only support binary state in UI.
    const res = await apiFetch(`/announcements/${announcementId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status: 'going' }),
    });

    if (res.status === 200) {
      const data = await res.json();
      return !!data.rsvp;
    }
  } catch (error) {
    console.error('Failed to toggle RSVP:', error);
  }
  return false;
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

// Deprecated functions (kept for compatibility during migration, but should result in errors/no-ops if called synchronously expectation)
// We renamed loadAnnouncements to fetchAnnouncements.
// The old synchronous export is removed to force refactoring.

