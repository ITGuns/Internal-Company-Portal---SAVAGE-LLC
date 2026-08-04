// Plan upgrade requests.
//
// Lives outside clients/ on purpose: the common case is a fresh sign-up with no
// roles and no ClientOrganization yet, so this cannot hang off an org the way
// ClientTicket does. Staff create or link the client account later and record it
// on the request.
//
// Payment is manual - nobody is charged here. Staff confirm money arrived and
// mark the request paid; the provider/external fields are carried so a real
// gateway can be added later without a migration.

import type { PrismaClient, UpgradeRequest } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { findDeskiiPlan } from '../billing/deskii-plans'

export class UpgradeRequestError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message)
  }
}

/**
 * requested -> invoiced -> paid -> fulfilled, with declined reachable from any
 * live state. Terminal states accept no further transition, so a fulfilled
 * request cannot be quietly reopened or re-paid.
 */
export const UPGRADE_REQUEST_STATUSES = [
  'requested',
  'invoiced',
  'paid',
  'fulfilled',
  'declined',
] as const

export type UpgradeRequestStatus = (typeof UPGRADE_REQUEST_STATUSES)[number]

const TERMINAL: ReadonlySet<string> = new Set(['fulfilled', 'declined'])

/** A request is still "live" (and therefore deduplicated) until it terminates. */
const OPEN_STATUSES = UPGRADE_REQUEST_STATUSES.filter((status) => !TERMINAL.has(status))

export function isUpgradeRequestStatus(value: unknown): value is UpgradeRequestStatus {
  return typeof value === 'string' && (UPGRADE_REQUEST_STATUSES as readonly string[]).includes(value)
}

export interface CreateUpgradeRequestInput {
  planSlug: string
  note?: string | null
}

export interface UpdateUpgradeRequestInput {
  status?: string
  organizationId?: string | null
  note?: string | null
  externalPaymentId?: string | null
  hostedCheckoutUrl?: string | null
}

export class UpgradesService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Record a request from the signed-in user.
   *
   * The plan is resolved server-side from its slug: the client sends only the
   * slug, never a name or a price, so a tampered request cannot invent a $0
   * plan. Name and price are snapshotted here so a later price change does not
   * rewrite what the customer actually asked for.
   */
  async createForUser(userId: string, input: CreateUpgradeRequestInput): Promise<UpgradeRequest> {
    const plan = findDeskiiPlan(input.planSlug)
    if (!plan) throw new UpgradeRequestError('Unknown plan', 400)
    // Enterprise is negotiated and carries no monthly figure, so it cannot be
    // recorded as a priced request. Those come through sales, not this queue.
    if (plan.monthlyPrice === null) {
      throw new UpgradeRequestError('That plan is arranged with our sales team', 400)
    }

    // One live request per user: clicking a second plan updates the existing
    // one rather than filling the staff queue with duplicates.
    const open = await this.db.upgradeRequest.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] } },
      orderBy: { createdAt: 'desc' },
    })

    const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null

    if (open) {
      // Never rewrite a request money has already moved against.
      if (open.status === 'paid') {
        throw new UpgradeRequestError(
          'This request is already paid. Contact support to change your plan.',
          409,
        )
      }
      return this.db.upgradeRequest.update({
        where: { id: open.id },
        data: {
          planSlug: plan.slug,
          planName: plan.name,
          monthlyPrice: plan.monthlyPrice,
          status: 'requested',
          ...(note ? { note } : {}),
        },
      })
    }

    return this.db.upgradeRequest.create({
      data: {
        userId,
        planSlug: plan.slug,
        planName: plan.name,
        monthlyPrice: plan.monthlyPrice,
        status: 'requested',
        note,
      },
    })
  }

  /** The signed-in user's own requests. */
  async listForUser(userId: string): Promise<UpgradeRequest[]> {
    return this.db.upgradeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  /** Staff queue. Defaults to live requests; pass a status to narrow. */
  async listForStaff(status?: string) {
    const where = status && isUpgradeRequestStatus(status)
      ? { status }
      : { status: { in: [...OPEN_STATUSES] } }

    return this.db.upgradeRequest.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      take: 200,
      include: {
        user: { select: { id: true, email: true, name: true, avatar: true } },
        organization: { select: { id: true, name: true, slug: true } },
        handledBy: { select: { id: true, name: true, email: true } },
      },
    })
  }

  /**
   * Staff update: move status, attach the client account, or record payment
   * references. Setting status to 'paid' stamps paidAt; clearing it back off
   * 'paid' removes the stamp, so the two can never disagree.
   */
  async updateForStaff(
    id: string,
    handledById: string,
    input: UpdateUpgradeRequestInput,
  ): Promise<UpgradeRequest> {
    const existing = await this.db.upgradeRequest.findUnique({ where: { id } })
    if (!existing) throw new UpgradeRequestError('Upgrade request not found', 404)

    const data: Record<string, unknown> = { handledById }

    if (input.status !== undefined) {
      if (!isUpgradeRequestStatus(input.status)) {
        throw new UpgradeRequestError('Unknown status', 400)
      }
      if (TERMINAL.has(existing.status)) {
        throw new UpgradeRequestError(`This request is already ${existing.status}`, 409)
      }
      // Fulfilment means "the client account exists and carries the plan", so it
      // cannot be claimed without the account being recorded.
      const organizationId =
        input.organizationId !== undefined ? input.organizationId : existing.organizationId
      if (input.status === 'fulfilled' && !organizationId) {
        throw new UpgradeRequestError(
          'Link the client account before marking this fulfilled',
          422,
        )
      }
      data.status = input.status
      data.paidAt = input.status === 'paid' ? existing.paidAt ?? new Date() : existing.paidAt
      if (input.status !== 'paid' && input.status !== 'fulfilled') data.paidAt = null
    }

    if (input.organizationId !== undefined) {
      if (input.organizationId) {
        const organization = await this.db.clientOrganization.findUnique({
          where: { id: input.organizationId },
          select: { id: true },
        })
        if (!organization) throw new UpgradeRequestError('Client organization not found', 404)
      }
      data.organizationId = input.organizationId || null
    }

    if (input.note !== undefined) {
      data.note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null
    }
    if (input.externalPaymentId !== undefined) {
      data.externalPaymentId = input.externalPaymentId || null
    }
    if (input.hostedCheckoutUrl !== undefined) {
      data.hostedCheckoutUrl = input.hostedCheckoutUrl || null
    }

    // Fulfilment is the moment the purchase becomes real on the account, so the
    // service tier and billing figures are written here rather than left as a
    // second thing staff must remember. Everything lands in one transaction: a
    // request marked fulfilled but carrying no tier is precisely the silent
    // mismatch this whole area already suffered from once.
    if (data.status === 'fulfilled') {
      const targetOrganizationId = (data.organizationId as string | undefined) ?? existing.organizationId
      if (!targetOrganizationId) throw new UpgradeRequestError('Link the client account before marking this fulfilled', 422)
      return this.fulfil(id, data, targetOrganizationId, existing.planSlug, existing.monthlyPrice, existing.currency)
    }

    return this.db.upgradeRequest.update({ where: { id }, data })
  }

  /**
   * Apply the purchased plan to the client account and close the request.
   *
   * Refuses rather than half-applying: if the ClientServiceTier row for the
   * purchased plan is missing, fulfilment fails with an actionable message
   * instead of marking the request done and leaving the account tier-less.
   */
  private async fulfil(
    id: string,
    data: Record<string, unknown>,
    organizationId: string,
    planSlug: string,
    monthlyPrice: number,
    currency: string,
  ): Promise<UpgradeRequest> {
    const plan = findDeskiiPlan(planSlug)
    if (!plan) {
      throw new UpgradeRequestError(`Plan "${planSlug}" is no longer offered; decline this request instead`, 422)
    }

    // Deliberately does NOT touch ClientOrganization.tierId.
    //
    // That field is the Gemfield website service level ($497-$9,997/mo) - what a
    // client pays us to build their site. This request is for a Deskii
    // subscription (Starter, Professional...). Writing one into the other would
    // relabel a managed-growth client as being on a $29 plan. They are two
    // ladders, and the whole point of separating the catalogs was to stop them
    // being confused for each other.
    //
    // The billing record is still written, because it is where the money owed is
    // read from, and it is stamped with the plan name so it cannot be mistaken
    // for a website package.
    return this.db.$transaction(async (tx) => {
      const organization = await tx.clientOrganization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      })
      if (!organization) {
        throw new UpgradeRequestError('That client account no longer exists - decline this request instead', 409)
      }

      await tx.clientBillingStatus.upsert({
        where: { organizationId },
        update: { planName: `Deskii ${plan.name}`, monthlyAmount: monthlyPrice, currency },
        create: {
          organizationId,
          planName: `Deskii ${plan.name}`,
          monthlyAmount: monthlyPrice,
          currency,
          status: 'active',
        },
      })

      return tx.upgradeRequest.update({ where: { id }, data })
    })
  }
}
