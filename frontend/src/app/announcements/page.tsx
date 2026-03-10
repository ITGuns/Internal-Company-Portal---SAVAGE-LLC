"use client";

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { AnnouncementSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import AnnouncementCard from '@/components/announcements/AnnouncementCard'
import AnnouncementFormModal from '@/components/announcements/AnnouncementFormModal'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/components/ToastProvider'
import { Megaphone, Plus, Calendar, Trophy, Cake, Trash2, AlertCircle } from 'lucide-react'
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
import { useAnnouncements } from '@/hooks/useAnnouncementsQuery'
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/contexts/UserContext'

type FilterCategory = 'all' | Category;

export default function AnnouncementsPage() {
  const toast = useToast();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  const { data: announcements = [], isLoading: loading } = useAnnouncements();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showModal, setShowModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

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

  const filteredAnnouncements = activeFilter === 'all'
    ? announcements
    : announcements.filter(a => a.category === activeFilter);

  const totalPages = Math.ceil(filteredAnnouncements.length / PAGE_SIZE);
  const paginatedAnnouncements = filteredAnnouncements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (filter: FilterCategory) => {
    setActiveFilter(filter);
    setPage(1);
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

  const handleToggleGoing = async (id: string) => {
    await toggleGoing(id);
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

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenu && !(event.target as Element).closest('.menu-container')) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openMenu) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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

        <div className="mt-6 flex items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <Card variant="interactive" padding="md" className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-500" />
              </div>
              <div className="font-semibold text-sm">Company News</div>
              <div className="text-xs text-[var(--muted)] mt-1">Important updates</div>
            </Card>

            <Card variant="interactive" padding="md" className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div className="font-semibold text-sm">Shoutouts</div>
              <div className="text-xs text-[var(--muted)] mt-1">Celebrate success</div>
            </Card>

            <Card variant="interactive" padding="md" className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div className="font-semibold text-sm">Events</div>
              <div className="text-xs text-[var(--muted)] mt-1">Upcoming activities</div>
            </Card>

            <Card variant="interactive" padding="md" className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Cake className="w-6 h-6 text-pink-500" />
              </div>
              <div className="font-semibold text-sm">Birthdays</div>
              <div className="text-xs text-[var(--muted)] mt-1">Celebrate team</div>
            </Card>
          </div>

          <Button
            onClick={() => setShowModal(true)}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            className="ml-4 whitespace-nowrap"
          >
            New Announcement
          </Button>
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
          <div className="flex items-center gap-2 border-b border-[var(--border)]">
            <Button
              onClick={() => handleFilterChange('all')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'all' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              All Posts
            </Button>
            <Button
              onClick={() => handleFilterChange('company-news')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'company-news' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Company News
            </Button>
            <Button
              onClick={() => handleFilterChange('shoutouts')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'shoutouts' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Shoutouts
            </Button>
            <Button
              onClick={() => handleFilterChange('events')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'events' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Events
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements yet"
                description="Company announcements and updates will appear here"
                actionLabel="Create Announcement"
                onAction={() => setShowModal(true)}
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
                    commentText={commentText}
                    onToggleMenu={() => setOpenMenu(openMenu === announcement.id ? null : announcement.id)}
                    onEdit={() => handleEditAnnouncement(announcement)}
                    onDelete={() => handleDeleteAnnouncement(announcement.id)}
                    onToggleLike={() => handleToggleLike(announcement.id)}
                    onToggleGoing={() => handleToggleGoing(announcement.id)}
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
