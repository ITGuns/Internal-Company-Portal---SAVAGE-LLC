import express, { Request, Response, Router } from 'express'
import { UsersService } from './users.service'
import { authenticateToken } from '../auth/auth.middleware'
import { emailService } from '../email/email.service'

export class UsersController {
    private service = new UsersService()

    router(): Router {
        const router = express.Router()

        // Get all users
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const users = await this.service.findAll()
                res.json(users)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch users' })
            }
        })

        // Search users
        router.get('/search', authenticateToken, async (req: Request, res: Response) => {
            try {
                const query = req.query.q as string
                if (!query) {
                    return res.status(400).json({ error: 'Search query required' })
                }
                const users = await this.service.search(query)
                res.json(users)
            } catch (error) {
                res.status(500).json({ error: 'Failed to search users' })
            }
        })

        // Get user by ID
        router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const user = await this.service.findById(id)

                if (!user) {
                    return res.status(404).json({ error: 'User not found' })
                }

                res.json(user)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user' })
            }
        })

        // Get user's roles
        router.get('/:id/roles', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const roles = await this.service.getUserRoles(id)
                res.json(roles)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user roles' })
            }
        })

        // Get user's tasks
        router.get('/:id/tasks', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const tasks = await this.service.getUserTasks(id)
                res.json(tasks)
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user tasks' })
            }
        })

        // Create user
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { email, name, avatar } = req.body

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' })
                }

                // Check if user already exists
                const existingUser = await this.service.findByEmail(email)
                if (existingUser) {
                    return res.status(409).json({ error: 'User with this email already exists' })
                }

                const user = await this.service.create({ email, name, avatar })

                // Send welcome email (async, don't block response)
                const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
                emailService.sendWelcomeEmail(
                    user.email,
                    user.name || 'New User',
                    `${loginUrl}/login`
                ).catch(err => {
                    console.error('Failed to send welcome email:', err)
                    // Don't fail user creation if email fails
                })

                res.status(201).json(user)
            } catch (error) {
                res.status(500).json({ error: 'Failed to create user' })
            }
        })

        // Update user
        router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { name, avatar } = req.body

                // Check if user exists
                const existingUser = await this.service.findById(id)
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' })
                }

                const user = await this.service.update(id, { name, avatar })
                res.json(user)
            } catch (error) {
                res.status(500).json({ error: 'Failed to update user' })
            }
        })

        // Delete user
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                // Check if user exists
                const existingUser = await this.service.findById(id)
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' })
                }

                await this.service.delete(id)
                res.json({ message: 'User deleted successfully' })
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete user' })
            }
        })

        return router
    }
}
