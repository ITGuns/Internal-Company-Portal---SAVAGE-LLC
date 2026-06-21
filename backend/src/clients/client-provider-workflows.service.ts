import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import {
  CLIENT_ACTIVITY_TYPES,
  createClientActivity,
} from './clients.activity'
import { ClientValidationError } from './clients.validation'
import type {
  CreateClientBookingRequestInput,
  CreateClientInvoiceInput,
  GenerateClientInvoiceInput,
  UpdateClientBookingRequestInput,
  UpdateClientInvoiceInput,
  UpsertClientPaymentConnectionInput,
  UpsertClientStorageRootInput,
} from './clients.validation'

const BILLABLE_CLIENT_STATUSES = new Set(['active', 'trial', 'past_due'])

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUtcDay(date: Date): Date {
  const end = startOfUtcDay(date)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(-1)
  return end
}

function invoiceNumberFor(organizationSlug: string, issueDate: Date, sequenceSeed: string): string {
  const compactSlug = organizationSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'CLIENT'
  const period = `${issueDate.getUTCFullYear()}${String(issueDate.getUTCMonth() + 1).padStart(2, '0')}`
  return `DESK-${compactSlug}-${period}-${sequenceSeed.slice(-6).toUpperCase()}`
}

export class ClientProviderWorkflowsService {
  constructor(private prisma: PrismaClient) {}

  async upsertStorageRoot(organizationId: string, data: UpsertClientStorageRootInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.clientOrganization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, slug: true },
      })
      if (!organization) throw new ClientValidationError('Client organization not found')

      const existing = await tx.clientStorageRoot.findUnique({ where: { organizationId } })
      const folderName = data.folderName || `${organization.name} Client Storage`
      let directoryFolderId = existing?.directoryFolderId || null

      if (directoryFolderId) {
        await tx.fileFolder.update({
          where: { id: directoryFolderId },
          data: {
            name: folderName,
            department: `Client: ${organization.name}`,
            driveLink: data.externalUrl || null,
          },
        })
      } else {
        const directoryFolder = await tx.fileFolder.create({
          data: {
            name: folderName,
            type: 'folder',
            department: `Client: ${organization.name}`,
            driveLink: data.externalUrl || null,
            customColor: '#3b82f6',
            createdById: actorId || null,
          },
        })
        directoryFolderId = directoryFolder.id
      }

      const storageRoot = await tx.clientStorageRoot.upsert({
        where: { organizationId },
        update: {
          provider: data.provider,
          status: data.status,
          folderName,
          directoryFolderId,
          externalFolderId: data.externalFolderId ?? null,
          externalUrl: data.externalUrl ?? null,
          notes: data.notes ?? null,
        },
        create: {
          organizationId,
          provider: data.provider,
          status: data.status,
          folderName,
          directoryFolderId,
          externalFolderId: data.externalFolderId ?? null,
          externalUrl: data.externalUrl ?? null,
          notes: data.notes ?? null,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.storageRootUpdated,
        subjectType: 'storage_root',
        subjectId: storageRoot.id,
        visibility: 'internal',
        title: `Client storage ${existing ? 'updated' : 'created'}: ${storageRoot.folderName}`,
        body: storageRoot.notes || null,
        metadata: {
          provider: storageRoot.provider,
          status: storageRoot.status,
          directoryFolderId: storageRoot.directoryFolderId,
          externalFolderId: storageRoot.externalFolderId,
        },
      })

      return storageRoot
    })
  }

  async createBookingRequest(organizationId: string, requestedById: string | undefined, data: CreateClientBookingRequestInput) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.clientBookingRequest.create({
        data: {
          organizationId,
          requestedById: requestedById || null,
          provider: data.provider,
          status: data.status,
          subject: data.subject,
          preferredStartAt: data.preferredStartAt,
          preferredEndAt: data.preferredEndAt,
          timezone: data.timezone,
          meetingUrl: data.meetingUrl,
          notes: data.notes,
          visibleToClient: data.visibleToClient,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: requestedById,
        type: CLIENT_ACTIVITY_TYPES.bookingRequestUpdated,
        subjectType: 'booking_request',
        subjectId: booking.id,
        visibility: booking.visibleToClient ? 'client' : 'internal',
        title: `Call request ${booking.status}: ${booking.subject}`,
        body: booking.notes || null,
        metadata: {
          provider: booking.provider,
          status: booking.status,
          preferredStartAt: booking.preferredStartAt?.toISOString() || null,
          preferredEndAt: booking.preferredEndAt?.toISOString() || null,
        },
      })

      return booking
    })
  }

  async findBookingRequestById(id: string) {
    return this.prisma.clientBookingRequest.findUnique({ where: { id } })
  }

  async updateBookingRequest(id: string, data: UpdateClientBookingRequestInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.clientBookingRequest.update({
        where: { id },
        data,
      })

      await createClientActivity(tx, {
        organizationId: booking.organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.bookingRequestUpdated,
        subjectType: 'booking_request',
        subjectId: booking.id,
        visibility: booking.visibleToClient ? 'client' : 'internal',
        title: `Call request updated: ${booking.subject}`,
        body: booking.notes || null,
        metadata: {
          provider: booking.provider,
          status: booking.status,
          meetingUrl: booking.meetingUrl,
        },
      })

      return booking
    })
  }

  async upsertPaymentConnection(organizationId: string, data: UpsertClientPaymentConnectionInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const connection = await tx.clientPaymentConnection.upsert({
        where: {
          organizationId_provider_accountType: {
            organizationId,
            provider: data.provider,
            accountType: data.accountType,
          },
        },
        update: {
          status: data.status,
          mode: data.mode,
          accountLabel: data.accountLabel ?? null,
          externalCustomerId: data.externalCustomerId ?? null,
          externalMerchantId: data.externalMerchantId ?? null,
          lastFour: data.lastFour ?? null,
          webhookStatus: data.webhookStatus,
          notes: data.notes ?? null,
        },
        create: {
          organizationId,
          provider: data.provider,
          accountType: data.accountType,
          status: data.status,
          mode: data.mode,
          accountLabel: data.accountLabel ?? null,
          externalCustomerId: data.externalCustomerId ?? null,
          externalMerchantId: data.externalMerchantId ?? null,
          lastFour: data.lastFour ?? null,
          webhookStatus: data.webhookStatus,
          notes: data.notes ?? null,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.paymentConnectionUpdated,
        subjectType: 'payment_connection',
        subjectId: connection.id,
        visibility: 'internal',
        title: `${connection.provider} connection updated: ${connection.status}`,
        body: connection.notes || null,
        metadata: {
          provider: connection.provider,
          accountType: connection.accountType,
          mode: connection.mode,
          webhookStatus: connection.webhookStatus,
        },
      })

      return connection
    })
  }

  async createInvoice(organizationId: string, data: CreateClientInvoiceInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const billing = await tx.clientBillingStatus.findUnique({
        where: { organizationId },
        select: { id: true },
      })
      const seed = invoiceSeed()
      const organization = await tx.clientOrganization.findUnique({
        where: { id: organizationId },
        select: { slug: true },
      })
      if (!organization) throw new ClientValidationError('Client organization not found')
      const issueAt = data.issueAt || new Date()

      const invoice = await tx.clientInvoice.create({
        data: {
          organizationId,
          billingStatusId: billing?.id || null,
          invoiceNumber: data.invoiceNumber || invoiceNumberFor(organization.slug, issueAt, seed),
          provider: data.provider,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          issueAt,
          dueAt: data.dueAt,
          paidAt: data.paidAt,
          externalInvoiceId: data.externalInvoiceId,
          hostedInvoiceUrl: data.hostedInvoiceUrl,
          notes: data.notes,
          visibleToClient: data.visibleToClient,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.invoiceUpdated,
        subjectType: 'invoice',
        subjectId: invoice.id,
        visibility: invoice.visibleToClient ? 'client' : 'internal',
        title: `Invoice ${invoice.status}: ${invoice.invoiceNumber || invoice.id}`,
        body: invoice.notes || null,
        metadata: {
          provider: invoice.provider,
          status: invoice.status,
          amount: invoice.amount,
          currency: invoice.currency,
          dueAt: invoice.dueAt?.toISOString() || null,
        },
      })

      return invoice
    })
  }

  async findInvoiceById(id: string) {
    return this.prisma.clientInvoice.findUnique({ where: { id } })
  }

  async updateInvoice(id: string, data: UpdateClientInvoiceInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.update({
        where: { id },
        data: {
          ...data,
          currency: data.currency?.toUpperCase(),
        },
      })

      await createClientActivity(tx, {
        organizationId: invoice.organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.invoiceUpdated,
        subjectType: 'invoice',
        subjectId: invoice.id,
        visibility: invoice.visibleToClient ? 'client' : 'internal',
        title: `Invoice updated: ${invoice.invoiceNumber || invoice.id}`,
        body: invoice.notes || null,
        metadata: {
          provider: invoice.provider,
          status: invoice.status,
          amount: invoice.amount,
          currency: invoice.currency,
          paidAt: invoice.paidAt?.toISOString() || null,
        },
      })

      return invoice
    })
  }

  async generateMonthlyInvoice(organizationId: string, data: GenerateClientInvoiceInput, actorId?: string) {
    const billing = await this.prisma.clientBillingStatus.findUnique({
      where: { organizationId },
    })
    if (!billing || !billing.monthlyAmount || billing.monthlyAmount <= 0) {
      throw new ClientValidationError('Monthly billing amount is required before generating an invoice')
    }
    if (!BILLABLE_CLIENT_STATUSES.has(billing.status)) {
      throw new ClientValidationError('Billing status is not invoiceable')
    }

    return this.createInvoice(organizationId, {
      provider: data.provider,
      status: data.status,
      amount: billing.monthlyAmount,
      currency: billing.currency,
      dueAt: data.dueAt || billing.renewalAt || addDays(new Date(), 14),
      notes: data.notes || billing.notes || undefined,
      visibleToClient: data.visibleToClient,
    }, actorId)
  }

  async generateDueInvoices(now = new Date()) {
    const horizon = addDays(now, 7)
    const billings = await this.prisma.clientBillingStatus.findMany({
      where: {
        status: { in: Array.from(BILLABLE_CLIENT_STATUSES) },
        monthlyAmount: { gt: 0 },
        renewalAt: { lte: horizon },
      },
      include: {
        organization: {
          select: { id: true, slug: true },
        },
      },
      take: 100,
    })

    const created: string[] = []
    const skipped: Array<{ organizationId: string; reason: string }> = []

    for (const billing of billings) {
      const dueAt = billing.renewalAt || addDays(now, 14)
      const existing = await this.prisma.clientInvoice.findFirst({
        where: {
          organizationId: billing.organizationId,
          dueAt: {
            gte: startOfUtcDay(dueAt),
            lte: endOfUtcDay(dueAt),
          },
          status: { notIn: ['void', 'archived'] },
        },
        select: { id: true },
      })
      if (existing) {
        skipped.push({ organizationId: billing.organizationId, reason: 'Invoice already exists for due date' })
        continue
      }

      const invoice = await this.createInvoice(billing.organizationId, {
        provider: 'manual',
        status: 'draft',
        amount: billing.monthlyAmount || 0,
        currency: billing.currency,
        dueAt,
        notes: billing.notes || undefined,
        visibleToClient: billing.visibleToClient,
      })
      created.push(invoice.id)
    }

    return { created, skipped, scanned: billings.length }
  }
}

function invoiceSeed(): string {
  return randomBytes(4).toString('hex')
}
