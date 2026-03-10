import express, { Request, Response, Router } from 'express'
import { FileDirectoryService } from './file-directory.service'
import { authenticateToken } from '../auth/auth.middleware'

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

        // GET /api/file-directory — root folders visible to this user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const folders = await this.service.findAll(user?.department, user?.role)
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
                const folders = await this.service.findChildren(id, user?.department, user?.role)
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
                if (user?.role !== 'admin' && folder.createdById !== user?.userId) {
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
