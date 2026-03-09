import { prisma } from '../database/prisma.service'

export class FileDirectoryService {

    /** Get all root-level folders visible to a user's department.
     *  - Admins get ALL folders (no dept filter).
     *  - Regular users get "All Departments" folders + their own dept.
     */
    async findAll(userDepartment?: string, userRole?: string) {
        const isAdmin = userRole === 'admin'

        return prisma.fileFolder.findMany({
            where: {
                parentId: null, // root only; children fetched separately
                ...(isAdmin
                    ? {} // admins see everything
                    : {
                        OR: [
                            { department: 'All Departments' },
                            ...(userDepartment ? [{ department: userDepartment }] : []),
                        ],
                    }),
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    /** Get child folders of a parent — same access rules apply */
    async findChildren(parentId: string, userDepartment?: string, userRole?: string) {
        const isAdmin = userRole === 'admin'

        return prisma.fileFolder.findMany({
            where: {
                parentId,
                ...(isAdmin
                    ? {}
                    : {
                        OR: [
                            { department: 'All Departments' },
                            ...(userDepartment ? [{ department: userDepartment }] : []),
                        ],
                    }),
            },
            orderBy: { name: 'asc' },
        })
    }

    async create(data: {
        name: string
        type?: string
        department: string
        driveLink?: string
        parentId?: string | null
        customColor?: string
        createdById?: string
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
            },
        })
    }

    async delete(id: string) {
        // Cascade deletes children via DB relation
        return prisma.fileFolder.delete({ where: { id } })
    }

    async findById(id: string) {
        return prisma.fileFolder.findUnique({ where: { id } })
    }
}
