"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { AnnouncementSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import AnnouncementCard from '@/components/announcements/AnnouncementCard'
import AnnouncementFormModal from '@/components/announcements/AnnouncementFormModal'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/components/ToastProvider'
import { Megaphone, Plus, Calendar, Trophy, Cake, Trash2, AlertCircle, type LucideIcon } from 'lucide-react'
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleLike,
  addComment,
  toggleGoing,
  type Announcement,
  type AnnouncementCategory as Category,
} from '@/lib/announcements'
import {
  buildAnnouncementFilterOptions,
  countAnnouncementsByCategory,
  filterAnnouncementsByCategory,
  formatAnnouncementCategoryLabel,
  getAnnouncementFilterFromSearch,
  type AnnouncementFilterCategory,
} from '@/lib/announcement-filters'
import { cn } from '@/lib/utils'
import { useAnnouncements } from '@/hooks/useAnnouncementsQuery'
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/contexts/UserContext'
import { useEscapeToClose } from '@/hooks/useEscapeToClose'
import { hasManagementAccess } from '@/lib/role-access'

const CATEGORY_PRESENTATION: Record<string, {
  icon: LucideIcon;
  iconClassName: string;
  iconSurfaceClassName: string;
  activeClassName: string;
}> = {
  'company-news': {
    icon: Megaphone,
    iconClassName: 'text-blue-400',
    iconSurfaceClassName: 'bg-blue-500/10',
    activeClassName: 'border-blue-400/70 bg-blue-500/10',
  },
  shoutouts: {
    icon: Trophy,
    iconClassName: 'text-amber-300',
    iconSurfaceClassName: 'bg-amber-500/10',
    activeClassName: 'border-amber-300/70 bg-amber-500/10',
  },
  events: {
    icon: Calendar,
    iconClassName: 'text-violet-300',
    iconSurfaceClassName: 'bg-violet-500/10',
    activeClassName: 'border-violet-300/70 bg-violet-500/10',
  },
  birthdays: {
    icon: Cake,
    iconClassName: 'text-pink-300',
    iconSurfaceClassName: 'bg-pink-500/10',
    activeClassName: 'border-pink-300/70 bg-pink-500/10',
  },
};

export default function AnnouncementsPage() {
  const toast = useToast();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  const canManageAnnouncements = hasManagementAccess(currentUser);
  const { data: announcements = [], isLoading: loading } = useAnnouncements();
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilterCategory>(() => {
    if (typeof window === 'undefined') return 'all';
    return getAnnouncementFilterFromSearch(new URLSearchParams(window.location.search));
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showModal, setShowModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const closeAnnouncementMenu = useCallback(() => setOpenMenu(null), []);

  useEscapeToClose({ isOpen: Boolean(openMenu), onClose: closeAnnouncementMenu });

  // Form state for new announcement
  const [newCategory, setNewCategory] = useState<Category>('company-news');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isEvent, setIsEvent] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isBirthday, setIsBirthday] = useState(false);
  const [birthdayDate, setBirthdayDate] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  const filteredAnnouncements = useMemo(
    () => filterAnnouncementsByCategory(announcements, activeFilter),
    [activeFilter, announcements],
  );
  const announcementFilterOptions = useMemo(
    () => buildAnnouncementFilterOptions(announcements),
    [announcements],
  );

  const totalPages = Math.ceil(filteredAnnouncements.length / PAGE_SIZE);
  const paginatedAnnouncements = filteredAnnouncements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterOption = announcementFilterOptions.find((option) => option.value === activeFilter);

  const handleFilterChange = (filter: AnnouncementFilterCategory) => {
    setActiveFilter(filter);
    setPage(1);

    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    if (filter === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', filter);
    }

    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  };

  const handleAddAnnouncement = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;

    const eventDetails = isEvent && eventDate && eventLocation ? {
      date: eventDate,
      location: eventLocation,
      going: [],
      goingNames: [],
    } : undefined;

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        await updateAnnouncement(editingAnnouncement.id, {
          category: newCategory,
          title: newTitle.trim(),
          body: newBody.trim(),
          eventDetails,
          birthdayDate: isBirthday ? birthdayDate : undefined,
          isImportant,
        });
        toast.success('Announcement updated successfully');
      } else {
        // Add new announcement
        await addAnnouncement(
          newCategory,
          newTitle.trim(),
          newBody.trim(),
          currentUser?.name || 'User',
          eventDetails,
          isImportant,
          isBirthday ? birthdayDate : undefined
        );
        toast.success('Announcement posted successfully');
      }

      // React Query cache is invalidated automatically via socket data:changed event
      // Also invalidate locally for instant feedback for the current user
      queryClient.invalidateQueries({ queryKey: ['announcements'] });

      // Reset form
      setNewTitle('');
      setNewBody('');
      setEventDate('');
      setEventLocation('');
      setBirthdayDate('');
      setIsEvent(false);
      setIsBirthday(false);
      setIsImportant(false);
      setEditingAnnouncement(null);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save announcement:', err);
      toast.error('Failed to save announcement');
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewCategory(announcement.category);
    setNewTitle(announcement.title);
    setNewBody(announcement.body);
    setIsEvent(announcement.category === 'events');
    setIsBirthday(announcement.category === 'birthdays');
    setIsImportant(announcement.isImportant);
    if (announcement.eventDetails) {
      setEventDate(announcement.eventDetails.date);
      setEventLocation(announcement.eventDetails.location);
    }
    if (announcement.birthdayDate) {
      // Backend returns ISO string, input[type=date] needs YYYY-MM-DD
      setBirthdayDate(announcement.birthdayDate.split('T')[0]);
    }
    setOpenMenu(null);
    setShowModal(true);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncementToDelete(id);
    setOpenMenu(null);
  };

  const confirmDelete = async () => {
    if (announcementToDelete) {
      await deleteAnnouncement(announcementToDelete);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setAnnouncementToDelete(null);
      toast.success('Announcement deleted');
    }
  };

  const handleToggleLike = async (id: string) => {
    // Optimistic update could be added here
    await toggleLike(id);
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  };

  const handleAddComment = async (announcementId: string) => {
    if (!commentText.trim()) return;
    await addComment(announcementId, commentText.trim(), currentUser?.name || 'User');
    setCommentText('');
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
    toast.success('Comment added');
  };

  const handleToggleGoing = async (announcement: Announcement) => {
    await toggleGoing(announcement.id, !isGoing(announcement));
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'company-news': return Megaphone;
      case 'shoutouts': return Trophy;
      case 'events': return Calendar;
      case 'birthdays': return Cake;
      default: return Megaphone;
    }
  };

  const isLiked = (announcement: Announcement) => {
    return currentUser && announcement.likes.includes(String(currentUser.id));
  };

  const isGoing = (announcement: Announcement) => {
    return (currentUser && announcement.eventDetails?.going.includes(String(currentUser.id))) || false;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFilterFromUrl = () => {
      setActiveFilter(getAnnouncementFilterFromSearch(new URLSearchParams(window.location.search)));
      setPage(1);
    };

    syncFilterFromUrl();
    window.addEventListener('popstate', syncFilterFromUrl);
    return () => window.removeEventListener('popstate', syncFilterFromUrl);
  }, []);

  // Close menu when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenu && !(event.target as Element).closest('.menu-container')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu]);

  if (loading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-3">
          <Header
            title="Announcements & Shoutouts"
            subtitle="Stay updated with company news and celebrate achievements"
          />
          <AnnouncementSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header
          title="Announcements & Shoutouts"
          subtitle="Stay updated with company news and celebrate achievements"
        />

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:flex-1">
            {announcementFilterOptions.map((option) => {
              const presentation = CATEGORY_PRESENTATION[option.value] || CATEGORY_PRESENTATION['company-news'];
              const Icon = presentation.icon;
              const count = countAnnouncementsByCategory(announcements, option.value);
              const isActive = activeFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleFilterChange(option.value)}
                  className={cn(
                    'min-h-[130px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-md)] active:translate-y-px active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
                    isActive && presentation.activeClassName,
                  )}
                >
                  <span className={cn('mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg', presentation.iconSurfaceClassName)}>
                    <Icon className={cn('h-6 w-6', presentation.iconClassName)} aria-hidden="true" />
                  </span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">{option.label}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{option.isCustom ? formatAnnouncementCategoryLabel(option.value) : option.description}</span>
                  <span className="mt-3 inline-flex min-h-7 items-center rounded-full border border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted)]">
                    {count} {count === 1 ? 'post' : 'posts'}
                  </span>
                </button>
              );
            })}
          </div>

          {canManageAnnouncements && (
            <Button
              onClick={() => setShowModal(true)}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              className="whitespace-nowrap xl:ml-4"
            >
              New Announcement
            </Button>
          )}
        </div>

        <AnnouncementFormModal
          isOpen={showModal}
          isEditing={!!editingAnnouncement}
          category={newCategory}
          setCategory={setNewCategory}
          title={newTitle}
          setTitle={setNewTitle}
          body={newBody}
          setBody={setNewBody}
          isEvent={isEvent}
          setIsEvent={setIsEvent}
          eventDate={eventDate}
          setEventDate={setEventDate}
          eventLocation={eventLocation}
          setEventLocation={setEventLocation}
          isBirthday={isBirthday}
          setIsBirthday={setIsBirthday}
          birthdayDate={birthdayDate}
          setBirthdayDate={setBirthdayDate}
          isImportant={isImportant}
          setIsImportant={setIsImportant}
          onSubmit={handleAddAnnouncement}
          onClose={() => {
            setShowModal(false);
            setNewTitle('');
            setNewBody('');
            setEventDate('');
            setEventLocation('');
            setBirthdayDate('');
            setIsEvent(false);
            setIsBirthday(false);
            setIsImportant(false);
            setEditingAnnouncement(null);
          }}
        />

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={announcementToDelete !== null}
          onClose={() => setAnnouncementToDelete(null)}
          title="Delete Announcement"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--foreground)]">
                  Are you sure you want to delete this announcement?
                </p>
                <p className="text-sm text-[var(--muted)] mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setAnnouncementToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)]">
            {[
              { value: 'all' as const, label: 'All Posts', count: announcements.length },
              ...announcementFilterOptions.map((option) => ({
                value: option.value,
                label: option.label,
                count: countAnnouncementsByCategory(announcements, option.value),
              })),
            ].map((option) => (
              <Button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                variant="ghost"
                size="sm"
                aria-pressed={activeFilter === option.value}
                className={cn(
                  activeFilter === option.value
                    ? 'rounded-b-none border-b-2 border-[var(--foreground)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]',
                )}
              >
                {option.label}
                <span className="rounded-full bg-[var(--card-surface)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                  {option.count}
                </span>
              </Button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={activeFilterOption ? `No ${activeFilterOption.label.toLowerCase()} yet` : 'No announcements yet'}
                description={activeFilterOption ? `${activeFilterOption.label} posts will appear here.` : 'Company announcements and updates will appear here.'}
                actionLabel={activeFilter === 'all' && canManageAnnouncements ? 'Create Announcement' : 'View All Posts'}
                onAction={() => {
                  if (activeFilter === 'all' && canManageAnnouncements) {
                    setShowModal(true);
                  } else {
                    handleFilterChange('all');
                  }
                }}
              />
            ) : (
              <>
                {paginatedAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    categoryIcon={getCategoryIcon(announcement.category)}
                    liked={!!isLiked(announcement)}
                    going={isGoing(announcement)}
                    showingComments={showComments === announcement.id}
                    menuOpen={openMenu === announcement.id}
                    canManageActions={canManageAnnouncements}
                    commentText={commentText}
                    onToggleMenu={() => setOpenMenu(openMenu === announcement.id ? null : announcement.id)}
                    onEdit={() => handleEditAnnouncement(announcement)}
                    onDelete={() => handleDeleteAnnouncement(announcement.id)}
                    onToggleLike={() => handleToggleLike(announcement.id)}
                    onToggleGoing={() => handleToggleGoing(announcement)}
                    onToggleComments={() => setShowComments(showComments === announcement.id ? null : announcement.id)}
                    onCommentTextChange={setCommentText}
                    onAddComment={() => handleAddComment(announcement.id)}
                  />
                ))}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  total={filteredAnnouncements.length}
                  className="mt-6"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
