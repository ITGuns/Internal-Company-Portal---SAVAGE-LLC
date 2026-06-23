import express, { Request, Response, Router } from 'express'
import { FileDirectoryService } from './file-directory.service'
import { AuthRequest, authenticateToken } from '../auth/auth.middleware'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import { hasFullAccess, hasInternalDirectoryAccess } from '../org/org-access-policy'
import { createLogger } from '../observability/logger'

const logger = createLogger('file-directory.file-directory.controller')


export class FileDirectoryController {
    private service = new FileDirectoryService()

    router(): Router {
        const router = express.Router()

        const getUserDetails = async (userId: string | undefined, email?: string) => {
            if (!userId) {
                return {
                    role: 'member',
                    departments: [] as string[],
                    canReadInternalDirectory: false,
                    canChooseDepartment: false,
                }
            }
            const dbRoles = await prisma.userRole.findMany({
                where: { userId },
                include: { department: true }
            });
            const isConfiguredAdminEmail = isAdminEmail(email)
            const isGlobalAdmin = hasFullAccess(dbRoles, isConfiguredAdminEmail);
            return {
                role: isGlobalAdmin ? 'admin' : (dbRoles[0]?.role || 'member'),
                departments: dbRoles.map(r => r.department?.name).filter(Boolean) as string[],
                canReadInternalDirectory: hasInternalDirectoryAccess(dbRoles, isConfiguredAdminEmail),
                canChooseDepartment: isGlobalAdmin,
            };
        };

        // GET /api/file-directory — root folders visible to this user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const details = await getUserDetails(user?.userId, user?.email)

                if (!details.canReadInternalDirectory) {
                    return res.status(403).json({ error: 'File directory access is restricted to internal accounts' })
                }

                const folders = await this.service.findAll(details.departments, details.role)
                res.json(folders)
            } catch (error) {
                logger.error('Error fetching file folders:', error)
                res.status(500).json({ error: 'Failed to fetch folders' })
            }
        })

        // GET /api/file-directory/:id/children — child folders of a folder
        router.get('/:id/children', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const id = String(req.params.id)
                const details = await getUserDetails(user?.userId, user?.email)

                if (!details.canReadInternalDirectory) {
                    return res.status(403).json({ error: 'File directory access is restricted to internal accounts' })
                }

                const folders = await this.service.findChildren(id, details.departments, details.role)
                res.json(folders)
            } catch (error) {
                logger.error('Error fetching child folders:', error)
                res.status(500).json({ error: 'Failed to fetch child folders' })
            }
        })

        // POST /api/file-directory — create a folder (any authenticated user)
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const user = (req as AuthRequest).user
                const { name, type, department, parentId, customColor, uploadId } = req.body

                const details = await getUserDetails(user?.userId, user?.email)
                if (!details.canReadInternalDirectory) {
                    return res.status(403).json({ error: 'File directory access is restricted to internal accounts' })
                }

                const normalizedName = typeof name === 'string' ? name.trim() : ''
                if (!normalizedName) {
                    return res.status(400).json({ error: 'name is required' })
                }

                const resolvedDepartment = details.canChooseDepartment && typeof department === 'string' && department.trim()
                    ? department.trim()
                    : details.departments[0]

                if (!resolvedDepartment) {
                    return res.status(400).json({ error: 'File directory requires an assigned department' })
                }

                const normalizedUploadId = typeof uploadId === 'string' ? uploadId.trim() : ''
                if (normalizedUploadId) {
                    if (type !== 'file') {
                        return res.status(400).json({ error: 'Only file entries can reference an upload' })
                    }

                    const ownedUpload = await prisma.storedUpload.findFirst({
                        where: {
                            id: normalizedUploadId,
                            ownerId: user?.userId,
                            clientAsset: null,
                            fileFolder: null,
                        },
                        select: { id: true },
                    })
                    if (!ownedUpload) return res.status(404).json({ error: 'Upload not found' })
                }

                const folder = await this.service.create({
                    name: normalizedName,
                    type,
                    department: resolvedDepartment,
                    parentId,
                    customColor,
                    createdById: user?.userId,
                    uploadId: normalizedUploadId || undefined,
                })

                res.status(201).json(folder)
            } catch (error) {
                logger.error('Error creating folder:', error)
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
                const details = await getUserDetails(user?.userId, user?.email)
                if (!details.canReadInternalDirectory) {
                    return res.status(403).json({ error: 'File directory access is restricted to internal accounts' })
                }

                if (details.role !== 'admin' && folder.createdById !== user?.userId) {
                    return res.status(403).json({ error: 'Not authorized to delete this folder' })
                }

                await this.service.delete(id)
                res.json({ message: 'Folder deleted' })
            } catch (error) {
                logger.error('Error deleting folder:', error)
                res.status(500).json({ error: 'Failed to delete folder' })
            }
        })

        return router
    }
}
