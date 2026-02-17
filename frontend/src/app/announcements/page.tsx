"use client";

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useToast } from '@/components/ToastProvider'
import { Megaphone, Plus, Calendar, Trophy, Cake, Heart, MessageCircle, Send, MoreVertical, Edit, Trash2, AlertCircle } from 'lucide-react'
import {
  fetchAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleLike,
  addComment,
  toggleGoing,
  getTimeAgo,
  type Announcement,
  type AnnouncementCategory as Category,
} from '@/lib/announcements'
import { useUser } from '@/contexts/UserContext'

type FilterCategory = 'all' | Category;

export default function AnnouncementsPage() {
  const toast = useToast();
  const { user: currentUser } = useUser();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAnnouncements = activeFilter === 'all'
    ? announcements
    : announcements.filter(a => a.category === activeFilter);

  const handleAddAnnouncement = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;

    const eventDetails = isEvent && eventDate && eventLocation ? {
      date: eventDate,
      location: eventLocation,
      going: [],
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
          'User',
          eventDetails,
          isImportant,
          isBirthday ? birthdayDate : undefined
        );
        toast.success('Announcement posted successfully');
      }

      await loadData();

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
    } catch (error) {
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
      await loadData();
      setAnnouncementToDelete(null);
      toast.success('Announcement deleted');
    }
  };

  const handleToggleLike = async (id: string) => {
    // Optimistic update could be added here
    await toggleLike(id);
    await loadData();
  };

  const handleAddComment = async (announcementId: string) => {
    if (!commentText.trim()) return;
    await addComment(announcementId, commentText.trim(), 'User');
    setCommentText('');
    await loadData();
    toast.success('Comment added');
  };

  const handleToggleGoing = async (id: string) => {
    await toggleGoing(id);
    await loadData();
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

  const formatEventDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatBirthdayDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenu && !(event.target as Element).closest('.menu-container')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  if (loading) {
    return (
      <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-3">
          <Header
            title="Announcements & Shoutouts"
            subtitle="Stay updated with company news and celebrate achievements"
          />
          <LoadingSpinner message="Loading announcements..." />
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
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

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setNewTitle('');
            setNewBody('');
            setEventDate('');
            setEventLocation('');
            setBirthdayDate('');
            setIsEvent(false);
            setIsBirthday(false);
            setEditingAnnouncement(null);
          }}
          title={editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value as Category);
                  setIsEvent(e.target.value === 'events');
                  setIsBirthday(e.target.value === 'birthdays');
                }}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              >
                <option value="company-news">Company News</option>
                <option value="shoutouts">Shoutouts</option>
                <option value="events">Events</option>
                <option value="birthdays">Birthdays</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter announcement title..."
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
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
              <label htmlFor="isImportant" className="text-sm font-medium flex items-center gap-2">
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g., Main Conference Room"
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
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
                />
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => {
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
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAnnouncement}
                disabled={!newTitle.trim() || !newBody.trim()}
                variant="success"
                icon={<Send className="w-4 h-4" />}
              >
                {editingAnnouncement ? 'Update Announcement' : 'Post Announcement'}
              </Button>
            </div>
          </div>
        </Modal>

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
              onClick={() => setActiveFilter('all')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'all' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              All Posts
            </Button>
            <Button
              onClick={() => setActiveFilter('company-news')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'company-news' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Company News
            </Button>
            <Button
              onClick={() => setActiveFilter('shoutouts')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'shoutouts' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Shoutouts
            </Button>
            <Button
              onClick={() => setActiveFilter('events')}
              variant="ghost"
              size="sm"
              className={`${activeFilter === 'events' ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)] rounded-b-none' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Events
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <div className="p-8 text-center bg-[var(--card-surface)] rounded-lg border border-[var(--border)]">
                <Megaphone className="w-16 h-16 mx-auto text-[var(--muted)] opacity-50 mb-4" />
                <div className="text-lg font-medium text-[var(--foreground)] mb-2">No announcements yet</div>
                <div className="text-sm text-[var(--muted)]">Company announcements will appear here</div>
              </div>
            ) : (
              filteredAnnouncements.map((announcement) => {
                const IconComponent = getCategoryIcon(announcement.category);
                const liked = isLiked(announcement);
                const going = isGoing(announcement);
                const showingComments = showComments === announcement.id;

                return (
                  <Card key={announcement.id} variant="outlined" padding="lg" className="hover:shadow-sm transition">
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
                                onClick={() => setOpenMenu(openMenu === announcement.id ? null : announcement.id)}
                                className="p-1 rounded hover:bg-[var(--card-surface)] transition"
                                aria-label="More options"
                              >
                                <MoreVertical className="w-4 h-4 text-[var(--muted)]" />
                              </button>

                              {openMenu === announcement.id && (
                                <div className="menu-container absolute right-0 top-8 z-10 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                                  <button
                                    onClick={() => handleEditAnnouncement(announcement)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--card-surface)] transition flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
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
                        <p className="text-sm text-[var(--foreground)] mb-4 whitespace-pre-wrap">{announcement.body}</p>

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
                                onClick={() => handleToggleGoing(announcement.id)}
                                className={`text-sm px-3 py-1 rounded transition ${going
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                  : 'bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-surface)]'
                                  }`}
                              >
                                {going ? '✅ Going' : 'Mark as Going'}
                              </button>
                              <span className="text-sm text-[var(--muted)]">
                                {announcement.eventDetails.going.length} {announcement.eventDetails.going.length === 1 ? 'person' : 'people'} going
                              </span>
                            </div>
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
                            onClick={() => handleToggleLike(announcement.id)}
                            className={`flex items-center gap-1 transition ${liked ? 'text-red-500' : 'hover:text-[var(--foreground)]'
                              }`}
                          >
                            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                            <span>{announcement.likes.length} {announcement.likes.length === 1 ? 'like' : 'likes'}</span>
                          </button>
                          <button
                            onClick={() => setShowComments(showingComments ? null : announcement.id)}
                            className="flex items-center gap-1 hover:text-[var(--foreground)] transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{announcement.comments.length} {announcement.comments.length === 1 ? 'comment' : 'comments'}</span>
                          </button>
                        </div>

                        {showingComments && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            <div className="space-y-3 mb-4">
                              {announcement.comments.length === 0 ? (
                                <div className="text-sm text-[var(--muted)] text-center py-2">No comments yet</div>
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
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(announcement.id);
                                  }
                                }}
                                placeholder="Write a comment..."
                                className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm"
                              />
                              <button
                                onClick={() => handleAddComment(announcement.id)}
                                className="p-2 rounded bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition"
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
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
