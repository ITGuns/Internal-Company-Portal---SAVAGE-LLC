import express, { Request, Response, Router } from 'express'
import { AnnouncementsService } from './announcements.service'
import { authenticateToken, requireRole } from '../auth/auth.middleware'

interface AuthRequest extends Request {
    user?: {
        userId: string
        [key: string]: any
    }
}

export class AnnouncementsController {
    private service = new AnnouncementsService()

    router(): Router {
        const router = express.Router()

        // Get all announcements (with optional filtering)
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const category = req.query.category as string | undefined
                const important = req.query.important === 'true' ? true : req.query.important === 'false' ? false : undefined

                const items = await this.service.findAll(category, important)
                res.json(items)
            } catch (error) {
                console.error('Error fetching announcements:', error)
                res.status(500).json({ error: 'Failed to fetch announcements' })
            }
        })

        // Get single announcement by ID
        router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const announcement = await this.service.findById(id)
                if (!announcement) {
                    return res.status(404).json({ error: 'Announcement not found' })
                }
                res.json(announcement)
            } catch (error) {
                console.error('Error fetching announcement:', error)
                res.status(500).json({ error: 'Failed to fetch announcement' })
            }
        })

        // Create announcement
        router.post('/', authenticateToken, requireRole(['admin', 'manager', 'operations manager']), async (req: Request, res: Response) => {
            try {
                const { title, content, category, priority, isImportant, eventDate, eventLocation, birthdayDate } = req.body
                const user = (req as AuthRequest).user

                if (!title || !content) {
                    return res.status(400).json({ error: 'Title and content are required' })
                }

                const announcement = await this.service.create({
                    title,
                    content,
                    category,
                    priority,
                    isImportant,
                    eventDate,
                    eventLocation,
                    birthdayDate,
                    authorId: user?.userId
                })

                res.status(201).json(announcement)
            } catch (error) {
                console.error('Error creating announcement:', error)
                res.status(500).json({ error: 'Failed to create announcement' })
            }
        })

        // Update announcement
        router.patch('/:id', authenticateToken, requireRole(['admin', 'manager', 'operations manager']), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { title, content, category, priority, isImportant, eventDate, eventLocation, birthdayDate } = req.body

                const announcement = await this.service.update(id, {
                    title,
                    content,
                    category,
                    priority,
                    isImportant,
                    eventDate,
                    eventLocation,
                    birthdayDate
                })

                res.json(announcement)
            } catch (error) {
                console.error('Error updating announcement:', error)
                res.status(500).json({ error: 'Failed to update announcement' })
            }
        })

        // Delete announcement
        router.delete('/:id', authenticateToken, requireRole(['admin', 'manager', 'operations manager']), async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.delete(id)
                res.json({ message: 'Announcement deleted' })
            } catch (error) {
                console.error('Error deleting announcement:', error)
                res.status(500).json({ error: 'Failed to delete announcement' })
            }
        })

        // Toggle like on announcement
        router.post('/:id/like', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = (req as AuthRequest).user
                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                const result = await this.service.toggleLike(id, user.userId)
                res.json(result)
            } catch (error) {
                console.error('Error toggling like:', error)
                res.status(500).json({ error: 'Failed to toggle like' })
            }
        })

        // Add comment to announcement
        router.post('/:id/comments', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = (req as AuthRequest).user
                const { text } = req.body

                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                if (!text || !text.trim()) {
                    return res.status(400).json({ error: 'Comment text is required' })
                }

                const comment = await this.service.addComment(id, user.userId, text.trim())
                res.status(201).json(comment)
            } catch (error) {
                console.error('Error adding comment:', error)
                res.status(500).json({ error: 'Failed to add comment' })
            }
        })

        // Delete comment
        router.delete('/:id/comments/:commentId', authenticateToken, async (req: Request, res: Response) => {
            try {
                const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId
                const user = (req as AuthRequest).user
                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                await this.service.deleteComment(commentId, user.userId)
                res.json({ message: 'Comment deleted' })
            } catch (error: any) {
                console.error('Error deleting comment:', error)
                if (error.message === 'Comment not found') {
                    return res.status(404).json({ error: 'Comment not found' })
                }
                if (error.message === 'Unauthorized to delete this comment') {
                    return res.status(403).json({ error: 'Unauthorized to delete this comment' })
                }
                res.status(500).json({ error: 'Failed to delete comment' })
            }
        })

        // Toggle RSVP for event
        router.post('/:id/rsvp', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = (req as AuthRequest).user
                const { status } = req.body

                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                const result = await this.service.toggleRSVP(id, user.userId, status || 'going')
                res.json(result)
            } catch (error) {
                console.error('Error toggling RSVP:', error)
                res.status(500).json({ error: 'Failed to toggle RSVP' })
            }
        })

        return router
    }
}

