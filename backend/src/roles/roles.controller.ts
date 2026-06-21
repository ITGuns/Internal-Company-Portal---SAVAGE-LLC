import express, { Request, Response, Router, NextFunction } from 'express'
import { RolesService } from './roles.service'
import { authenticateToken, requireRole } from '../auth/auth.middleware'

export class RolesController {
    private service = new RolesService()

    router(): Router {
        const router = express.Router()

        /**
         * GET /api/roles
         * List all available roles
         * Public: needed by signup page
         */
        router.get('/', async (req: Request, res: Response, next: NextFunction) => {
            try {
                const departmentId = req.query.departmentId as string
                if (departmentId) {
                    const roles = await this.service.findByDepartment(departmentId)
                    res.json(roles)
                } else {
                    const roles = await this.service.findAll()
                    res.json(roles)
                }
            } catch (error) {
                next(error)
            }
        })

        /**
         * POST /api/roles
         * Create new role
         * Protected: Admin only
         */
        router.post(
            '/',
            authenticateToken,
            requireRole('admin'),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const { name, departmentId } = req.body

                    if (!name) {
                        res.status(400).json({ error: 'Role name is required' })
                        return
                    }

                    const role = await this.service.create({ name, departmentId })
                    res.status(201).json(role)
                } catch (error) {
                    if ((error as any).code === 'P2002') {
                        res.status(409).json({ error: 'Role already exists for this department' })
                        return
                    }
                    next(error)
                }
            }
        )

        /**
         * DELETE /api/roles/:id
         * Delete role
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
                        res.status(404).json({ error: 'Role not found' })
                        return
                    }
                    next(error)
                }
            }
        )

        return router
    }
}
