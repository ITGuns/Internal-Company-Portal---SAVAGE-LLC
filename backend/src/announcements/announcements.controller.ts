import express, { Request, Response, Router } from 'express'
import { AnnouncementsService } from './announcements.service'
import { authenticateToken } from '../auth/auth.middleware'

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

        // Get all announcements
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const items = await this.service.findAll()
                res.json(items)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch announcements' })
            }
        })

        // Create announcement
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { title, content, priority } = req.body
                const user = (req as AuthRequest).user

                if (!title || !content) {
                    return res.status(400).json({ error: 'Title and content are required' })
                }

                const announcement = await this.service.create({
                    title,
                    content,
                    priority,
                    authorId: user?.userId
                })

                res.status(201).json(announcement)
            } catch (error) {
                res.status(500).json({ error: 'Failed to create announcement' })
            }
        })

        // Delete announcement
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                await this.service.delete(req.params.id)
                res.json({ message: 'Announcement deleted' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete announcement' })
            }
        })

        return router
    }
}
