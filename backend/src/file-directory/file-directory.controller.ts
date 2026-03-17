import express, { Request, Response, Router } from 'express'
import { FileDirectoryService } from './file-directory.service'
import { authenticateToken } from '../auth/auth.middleware'
import { prisma } from '../database/prisma.service'
interface AuthRequest extends Request {
    user?: {
        userId: string
        role?: string
        department?: string
        [key: string]: unknown
    }
}

export class FileDirectoryController {
    private service = new FileDirectoryService()

    router(): Router {
        const router = express.Router()

        const getUserDetails = async (userId: string | undefined) => {
            if (!userId) return { role: 'member', departments: [] }
            const dbRoles = await prisma.userRole.findMany({
                where: { userId },
                include: { department: true }
            });
            const isGlobalAdmin = dbRoles.some(r => r.role === 'admin' || r.role === 'Overlord');
            return {
                role: isGlobalAdmin ? 'admin' : (dbRoles[0]?.role || 'member'),
                departments: dbRoles.map(r => r.department?.name).filter(Boolean) as string[]
            };
        };

        // GET /api/file-directory — root folders visible to this user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const details = await getUserDetails(user?.userId)
                
                // Allow "Operations leads" hack explicitly if needed, but the service `findAll` has the role check.
                // Actually if `details.role === 'admin'` they see all.
                // Or if email matches
                if (['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(user?.email?.toLowerCase() || '')) {
                    details.role = 'admin'
                }

                const folders = await this.service.findAll(details.departments, details.role)
                res.json(folders)
            } catch (error) {
                console.error('Error fetching file folders:', error)
                res.status(500).json({ error: 'Failed to fetch folders' })
            }
        })

        // GET /api/file-directory/:id/children — child folders of a folder
        router.get('/:id/children', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const id = String(req.params.id)
                const details = await getUserDetails(user?.userId)
                
                if (['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(user?.email?.toLowerCase() || '')) {
                    details.role = 'admin'
                }

                const folders = await this.service.findChildren(id, details.departments, details.role)
                res.json(folders)
            } catch (error) {
                console.error('Error fetching child folders:', error)
                res.status(500).json({ error: 'Failed to fetch child folders' })
            }
        })

        // POST /api/file-directory — create a folder (any authenticated user)
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const { name, type, department, driveLink, parentId, customColor } = req.body

                if (!name || !department) {
                    return res.status(400).json({ error: 'name and department are required' })
                }

                const folder = await this.service.create({
                    name,
                    type,
                    department,
                    driveLink,
                    parentId,
                    customColor,
                    createdById: user?.userId,
                })

                res.status(201).json(folder)
            } catch (error) {
                console.error('Error creating folder:', error)
                res.status(500).json({ error: 'Failed to create folder' })
            }
        })

        // DELETE /api/file-directory/:id — delete a folder
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const id = String(req.params.id)

                const folder = await this.service.findById(String(req.params.id))
                if (!folder) {
                    return res.status(404).json({ error: 'Folder not found' })
                }

                // Only admin or the creator can delete
                const details = await getUserDetails(user?.userId)
                if (['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'].includes(user?.email?.toLowerCase() || '')) {
                    details.role = 'admin'
                }

                if (details.role !== 'admin' && folder.createdById !== user?.userId) {
                    return res.status(403).json({ error: 'Not authorized to delete this folder' })
                }

                await this.service.delete(id)
                res.json({ message: 'Folder deleted' })
            } catch (error) {
                console.error('Error deleting folder:', error)
                res.status(500).json({ error: 'Failed to delete folder' })
            }
        })

        return router
    }
}
