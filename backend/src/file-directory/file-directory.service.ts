import { prisma } from '../database/prisma.service'
import { UploadsService } from '../uploads/uploads.service'
import { createUploadStorage } from '../uploads/upload.storage'

export class FileDirectoryService {

    /** Get all root-level folders visible to a user's department.
     *  - Admins get ALL folders (no dept filter).
     *  - Regular users get "All Departments" folders + their own dept.
     */
    async findAll(userDepartments?: string[], userRole?: string) {
        const isAdmin = userRole === 'admin'

        return prisma.fileFolder.findMany({
            where: {
                parentId: null, // root only; children fetched separately
                ...(isAdmin
                    ? {} // admins see everything
                    : {
                        OR: [
                            { department: 'All Departments' },
                            ...(userDepartments && userDepartments.length > 0 ? [{ department: { in: userDepartments } }] : []),
                        ],
                    }),
            },
            include: {
                upload: {
                    select: {
                        sizeBytes: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    /** Get child folders of a parent — same access rules apply */
    async findChildren(parentId: string, userDepartments?: string[], userRole?: string) {
        const isAdmin = userRole === 'admin'

        return prisma.fileFolder.findMany({
            where: {
                parentId,
                ...(isAdmin
                    ? {}
                    : {
                        OR: [
                            { department: 'All Departments' },
                            ...(userDepartments && userDepartments.length > 0 ? [{ department: { in: userDepartments } }] : []),
                        ],
                    }),
            },
            include: {
                upload: {
                    select: {
                        sizeBytes: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        })
    }

    async create(data: {
        name: string
        type?: string
        department: string
        parentId?: string | null
        customColor?: string
        createdById?: string
        driveLink?: string | null
        uploadId?: string
    }) {
        return prisma.fileFolder.create({
            data: {
                name: data.name,
                type: data.type ?? 'folder',
                department: data.department,
                driveLink: data.driveLink ?? null,
                parentId: data.parentId ?? null,
                customColor: data.customColor ?? null,
                createdById: data.createdById ?? null,
                uploadId: data.uploadId ?? null,
            },
            include: {
                upload: {
                    select: {
                        sizeBytes: true,
                    },
                },
            },
        })
    }

    async delete(id: string) {
        // Collect every upload under this entry (the entry itself and all descendants)
        // before the row cascade removes the links, then delete the stored objects.
        const uploadIds = await this.collectUploadIds(id)
        const deleted = await prisma.fileFolder.delete({ where: { id } })
        if (uploadIds.length > 0) {
            const uploads = new UploadsService(createUploadStorage())
            await Promise.all(uploadIds.map((uploadId) => uploads.deleteUpload(uploadId).catch(() => false)))
        }
        return deleted
    }

    private async collectUploadIds(rootId: string): Promise<string[]> {
        const rows = await prisma.$queryRaw<Array<{ uploadId: string | null }>>`
            WITH RECURSIVE tree AS (
                SELECT id, "uploadId" FROM "FileFolder" WHERE id = ${rootId}
                UNION ALL
                SELECT f.id, f."uploadId" FROM "FileFolder" f JOIN tree t ON f."parentId" = t.id
            )
            SELECT "uploadId" FROM tree WHERE "uploadId" IS NOT NULL
        `
        return rows.map((row) => row.uploadId).filter((value): value is string => Boolean(value))
    }

    async findById(id: string) {
        return prisma.fileFolder.findUnique({
            where: { id },
            include: {
                upload: {
                    select: {
                        sizeBytes: true,
                    },
                },
            },
        })
    }
}
