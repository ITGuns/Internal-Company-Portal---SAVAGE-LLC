import express, { Request, Response, Router } from 'express'
import { DailyLogsService } from './daily-logs.service'
import { authenticateToken } from '../auth/auth.middleware'

interface AuthRequest extends Request {
    user?: {
        userId: string
        [key: string]: any
    }
}

export class DailyLogsController {
    private service = new DailyLogsService()

    router(): Router {
        const router = express.Router()

        // Get all logs (Admin/Manager view)
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const items = await this.service.findAll()
                res.json(items)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch logs' })
            }
        })

        // Get my logs
        router.get('/my-logs', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                if (!user) return res.sendStatus(401)

                const items = await this.service.findByAuthor(user.userId)
                res.json(items)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch your logs' })
            }
        })

        // Create log
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { content, date } = req.body
                const user = (req as AuthRequest).user

                if (!content) {
                    return res.status(400).json({ error: 'Content is required' })
                }

                const item = await this.service.create({
                    content,
                    date,
                    authorId: user?.userId
                })

                res.status(201).json(item)
            } catch (error) {
                res.status(500).json({ error: 'Failed to create log' })
            }
        })

        // Update log
        router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { content } = req.body
                const item = await this.service.update(req.params.id, content)
                res.json(item)
            } catch (error) {
                res.status(500).json({ error: 'Failed to update log' })
            }
        })

        // Delete log
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                await this.service.delete(req.params.id)
                res.json({ message: 'Log deleted' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete log' })
            }
        })

        return router
    }
}
