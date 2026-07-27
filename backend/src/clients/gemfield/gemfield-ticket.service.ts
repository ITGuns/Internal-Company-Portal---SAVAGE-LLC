import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../../database/prisma.service'
import { CLIENT_ACTIVITY_TYPES, createClientActivity } from '../clients.activity'
import { stripImageMetadata } from '../../uploads/image-metadata'
import { decodeBase64Payload, validateUploadContent } from '../../uploads/upload.validation'
import type { UploadsService } from '../../uploads/uploads.service'
import {
  GemfieldTicketValidationError,
  MAX_WIZARD_ATTACHMENTS,
  normalizeWizardTicket,
  type GemfieldWizardTicketInput,
} from './gemfield-ticket'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // mirrors the general upload cap in uploads.controller

export interface WizardTicketAttachmentInput {
  name?: string
  contentType?: string
  data: string // base64 (optionally a data: URI)
}

export interface CreatedWizardTicket {
  ticket: { id: string; title: string; description: string | null; priority: string; ticketKind: string | null }
  attachmentCount: number
}

export class GemfieldTicketService {
  constructor(
    private readonly uploads: UploadsService,
    private readonly db: PrismaClient = prisma,
  ) {}

  /**
   * Create a ClientTicket from a wizard submission (extend, never parallel). Attachments reuse the
   * StoredUpload pipeline; images are metadata-stripped before storage. dev_assist/callback and
   * broken-site tickets are routed to high priority.
   */
  async createWizardTicket(
    organizationId: string,
    requesterId: string,
    input: GemfieldWizardTicketInput,
    attachments: WizardTicketAttachmentInput[] = [],
  ): Promise<CreatedWizardTicket> {
    const normalized = normalizeWizardTicket(input)

    if (attachments.length > MAX_WIZARD_ATTACHMENTS) {
      throw new GemfieldTicketValidationError(`Please attach at most ${MAX_WIZARD_ATTACHMENTS} files`)
    }

    // Storage writes happen before the DB transaction (they are not transactional).
    const uploadIds: string[] = []
    for (const attachment of attachments) {
      const decoded = decodeBase64Payload(attachment.data)
      if (!decoded) throw new GemfieldTicketValidationError('An attachment could not be read')
      if (decoded.buffer.length > MAX_ATTACHMENT_BYTES) {
        throw new GemfieldTicketValidationError('An attachment is too large')
      }
      const contentType = validateUploadContent(attachment.contentType ?? decoded.mediaType, decoded.buffer)
      if (!contentType) throw new GemfieldTicketValidationError('That file type is not supported')

      const safeBuffer = stripImageMetadata(decoded.buffer, contentType)
      const stored = await this.uploads.create(
        requesterId,
        attachment.name || 'attachment',
        contentType,
        safeBuffer,
      )
      uploadIds.push(stored.id)
    }

    const ticket = await this.db.$transaction(async (tx) => {
      const created = await tx.clientTicket.create({
        data: {
          organizationId,
          projectId: normalized.projectId,
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          priority: normalized.priority,
          createdById: requesterId,
          ticketKind: normalized.ticketKind,
          sourceWizardVersion: normalized.sourceWizardVersion,
          wizardAnswers: normalized.wizardAnswers
            ? (normalized.wizardAnswers as Prisma.InputJsonObject)
            : undefined,
          attachments: uploadIds.length
            ? { create: uploadIds.map((uploadId) => ({ uploadId })) }
            : undefined,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: requesterId,
        type: CLIENT_ACTIVITY_TYPES.ticketCreated,
        subjectType: 'ticket',
        subjectId: created.id,
        visibility: 'client',
        title: `Request opened: ${created.title}`,
        body: created.description,
        metadata: {
          category: created.category,
          priority: created.priority,
          ticketKind: normalized.ticketKind,
          attachments: uploadIds.length,
        },
      })

      return created
    })

    return {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        ticketKind: ticket.ticketKind,
      },
      attachmentCount: uploadIds.length,
    }
  }
}

/** Stable human reference for a ticket (TK-XXXXXX). A monotonic counter is a later nicety (D6). */
export function ticketReference(ticketId: string): string {
  return `TK-${ticketId.slice(-6).toUpperCase()}`
}
