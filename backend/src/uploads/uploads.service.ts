import type { PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import { hasFullAccess, hasInternalDirectoryAccess } from '../org/org-access-policy'
import { hasClientManagementAccess } from '../clients/clients.access'
import { buildStoredUploadObjectKey } from './upload.validation'
import { canReadStoredUpload } from './upload.access'
import type { UploadStorage } from './upload.storage'

export class UploadsService {
    constructor(
        private readonly storage: UploadStorage,
        private readonly db: PrismaClient = prisma,
    ) {}

    async create(ownerId: string, originalName: string, contentType: string, buffer: Buffer) {
        const objectKey = buildStoredUploadObjectKey(contentType)
        if (!objectKey) throw new Error('Unsupported upload content type')

        await this.storage.save({ filename: objectKey, contentType, buffer })

        try {
            return await this.db.storedUpload.create({
                data: {
                    objectKey,
                    originalName,
                    contentType,
                    sizeBytes: buffer.length,
                    ownerId,
                },
            })
        } catch (error) {
            await this.storage.delete(objectKey).catch(() => undefined)
            throw error
        }
    }

    async readForUser(uploadId: string, requesterId: string, requesterEmail: string) {
        const [upload, roles, memberships] = await Promise.all([
            this.db.storedUpload.findUnique({
                where: { id: uploadId },
                include: {
                    clientAsset: {
                        select: {
                            organizationId: true,
                            visibleToClient: true,
                        },
                    },
                    fileFolder: {
                        select: { department: true },
                    },
                },
            }),
            this.db.userRole.findMany({
                where: { userId: requesterId },
                include: { department: true },
            }),
            this.db.clientMembership.findMany({
                where: {
                    userId: requesterId,
                    status: 'active',
                    organization: { status: 'active' },
                },
                select: { organizationId: true },
            }),
        ])

        if (!upload) return null

        const adminByEmail = isAdminEmail(requesterEmail)
        const allowed = canReadStoredUpload({
            requesterId,
            isClientManager: hasClientManagementAccess(roles, adminByEmail),
            clientOrganizationIds: memberships.map((membership) => membership.organizationId),
            canReadInternalDirectory: hasInternalDirectoryAccess(roles, adminByEmail),
            canReadAllDepartments: hasFullAccess(roles, adminByEmail),
            departments: roles
                .map((role) => role.department?.name)
                .filter((department): department is string => Boolean(department)),
        }, upload)

        if (!allowed) return null

        const file = await this.storage.read(upload.objectKey)
        return file ? { ...file, contentType: upload.contentType } : null
    }
}
