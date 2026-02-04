import express, { Request, Response, Router, NextFunction } from 'express'
import { DepartmentsService } from './departments.service'
import { authenticateToken, requireRole, AuthRequest } from '../auth/auth.middleware'

export class DepartmentsController {
    private service = new DepartmentsService()

    router(): Router {
        const router = express.Router()

        /**
         * GET /api/departments
         * List all departments
         * Protected: Authenticated users only
         */
        router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
            try {
                const departments = await this.service.findAll()
                res.json(departments)
            } catch (error) {
                next(error)
            }
        })

        /**
         * GET /api/departments/:id
         * Get department by ID
         * Protected: Authenticated users only
         */
        router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
            try {
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const department = await this.service.findById(id)
                if (!department) {
                    res.status(404).json({ error: 'Department not found' })
                    return
                }
                res.json(department)
            } catch (error) {
                next(error)
            }
        })

        /**
         * POST /api/departments
         * Create new department
         * Protected: Admin only
         */
        router.post(
            '/',
            authenticateToken,
            requireRole('admin'),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const { name, driveId } = req.body

                    if (!name) {
                        res.status(400).json({ error: 'Department name is required' })
                        return
                    }

                    const department = await this.service.create({ name, driveId })
                    res.status(201).json(department)
                } catch (error) {
                    // Handle unique constraint violation
                    if ((error as any).code === 'P2002') {
                        res.status(409).json({ error: 'Department with this name already exists' })
                        return
                    }
                    next(error)
                }
            }
        )

        /**
         * PATCH /api/departments/:id
         * Update department
         * Protected: Admin only
         */
        router.patch(
            '/:id',
            authenticateToken,
            requireRole('admin'),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                    const { name, driveId } = req.body
                    const department = await this.service.update(id, { name, driveId })
                    res.json(department)
                } catch (error) {
                    if ((error as any).code === 'P2025') {
                        res.status(404).json({ error: 'Department not found' })
                        return
                    }
                    if ((error as any).code === 'P2002') {
                        res.status(409).json({ error: 'Department with this name already exists' })
                        return
                    }
                    next(error)
                }
            }
        )

        /**
         * DELETE /api/departments/:id
         * Delete department
         * Protected: Admin only
         */
        router.delete(
            '/:id',
            authenticateToken,
            requireRole('admin'),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                    await this.service.delete(id)
                    res.status(204).send()
                } catch (error) {
                    if ((error as any).code === 'P2025') {
                        res.status(404).json({ error: 'Department not found' })
                        return
                    }
                    // Constraint violation (e.g. has users or tasks)
                    if ((error as any).code === 'P2003') {
                        res.status(400).json({ error: 'Cannot delete department with associated data' })
                        return
                    }
                    next(error)
                }
            }
        )

        return router
    }
}
