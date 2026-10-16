import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { parseStoredChatAttachment } from '../chat/chat.limits'
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

    /** An upload of this owner that no client asset, folder or ticket uses. */
    async findUnlinkedForOwner(uploadId: string, ownerId: string) {
        return this.db.storedUpload.findFirst({
            where: { id: uploadId, ownerId, clientAsset: null, fileFolder: null, ticketAttachment: null },
            select: { id: true, originalName: true, contentType: true, sizeBytes: true },
        })
    }

    /**
     * Whether a chat message matching `where` references this upload. Message.attachment is JSON
     * text, so rows are found by substring and confirmed by parsing.
     */
    async hasChatMessageWithUpload(uploadId: string, where: Prisma.MessageWhereInput = {}): Promise<boolean> {
        const messages = await this.db.message.findMany({
            where: { ...where, attachment: { contains: `"uploadId":${JSON.stringify(uploadId)}` } },
            select: { attachment: true },
            take: 20,
        })
        return messages.some((message) => parseStoredChatAttachment(message.attachment)?.uploadId === uploadId)
    }

    /** Remove the stored object and its row. Missing rows or objects are not errors. */
    async deleteUpload(uploadId: string): Promise<boolean> {
        const upload = await this.db.storedUpload.findUnique({ where: { id: uploadId }, select: { id: true, objectKey: true } })
        if (!upload) return false
        await this.storage.delete(upload.objectKey).catch(() => undefined)
        await this.db.storedUpload.delete({ where: { id: upload.id } }).catch(() => undefined)
        return true
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
                    ticketAttachment: {
                        select: {
                            ticket: {
                                select: { organizationId: true },
                            },
                        },
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

        // Chat: the uploader attached this file to a message in a conversation the requester is in.
        const ownerId = upload.ownerId
        const sharedWithRequesterInChat = ownerId !== null && ownerId !== requesterId
            && await this.hasChatMessageWithUpload(upload.id, {
                senderId: ownerId,
                conversation: { participants: { some: { userId: requesterId } } },
            })

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
        }, {
            ownerId: upload.ownerId,
            clientAsset: upload.clientAsset,
            fileFolder: upload.fileFolder,
            ticketAttachment: upload.ticketAttachment
                ? { organizationId: upload.ticketAttachment.ticket.organizationId }
                : null,
            sharedWithRequesterInChat,
        })

        if (!allowed) return null

        const file = await this.storage.read(upload.objectKey)
        return file ? { ...file, contentType: upload.contentType } : null
    }
}
