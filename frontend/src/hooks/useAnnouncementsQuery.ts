/**
 * React Query hooks for announcements.
 * Uses 'announcements' query key — automatically invalidated when
 * the backend emits a data:changed event for this resource.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAnnouncements,
  fetchAnnouncementsPaginated,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleLike,
  addComment,
  deleteComment,
  toggleGoing,
  type Announcement,
  type AnnouncementCategory,
  type EventDetails,
} from '@/lib/announcements';

const QUERY_KEY = ['announcements'] as const;

export function useAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAnnouncements,
  });
}

export function useAnnouncementsPaginated(page: number, limit: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'paginated', page, limit],
    queryFn: () => fetchAnnouncementsPaginated(page, limit),
    placeholderData: (prev) => prev,
  });
}

export function useAddAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      category: AnnouncementCategory;
      title: string;
      body: string;
      author?: string;
      eventDetails?: EventDetails;
      isImportant?: boolean;
      birthdayDate?: string;
    }) =>
      addAnnouncement(
        args.category,
        args.title,
        args.body,
        args.author,
        args.eventDetails,
        args.isImportant,
        args.birthdayDate,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Announcement, 'id'>> }) =>
      updateAnnouncement(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => toggleLike(announcementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, text }: { announcementId: string; text: string }) =>
      addComment(announcementId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, commentId }: { announcementId: string; commentId: string }) =>
      deleteComment(announcementId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleGoing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => toggleGoing(announcementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
