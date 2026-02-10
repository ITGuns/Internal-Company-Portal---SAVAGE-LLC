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

        // Get all logs (with optional filtering)
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const department = req.query.department as string | undefined
                const status = req.query.status as string | undefined

                const items = await this.service.findAll(department, status)
                res.json(items)
            } catch (error) {
                console.error('Error fetching logs:', error)
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
                console.error('Error fetching your logs:', error)
                res.status(500).json({ error: 'Failed to fetch your logs' })
            }
        })

        // Create log
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { content, date, department, status, hoursLogged, tasks } = req.body
                const user = (req as AuthRequest).user

                if (!content) {
                    return res.status(400).json({ error: 'Content is required' })
                }

                if (!department) {
                    return res.status(400).json({ error: 'Department is required' })
                }

                if (!user?.userId) {
                    return res.status(401).json({ error: 'User not authenticated' })
                }

                const item = await this.service.create({
                    content,
                    date,
                    department,
                    status,
                    hoursLogged,
                    tasks,
                    authorId: user.userId
                })

                res.status(201).json(item)
            } catch (error) {
                console.error('Error creating log:', error)
                res.status(500).json({ error: 'Failed to create log' })
            }
        })

        // Update log
        router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { content, department, status, hoursLogged, tasks } = req.body

                const item = await this.service.update(id, {
                    content,
                    department,
                    status,
                    hoursLogged,
                    tasks
                })

                res.json(item)
            } catch (error) {
                console.error('Error updating log:', error)
                res.status(500).json({ error: 'Failed to update log' })
            }
        })

        // Delete log
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                await this.service.delete(id)
                res.json({ message: 'Log deleted' })
            } catch (error) {
                console.error('Error deleting log:', error)
                res.status(500).json({ error: 'Failed to delete log' })
            }
        })

        // Toggle like on daily log
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

        return router
    }
}

