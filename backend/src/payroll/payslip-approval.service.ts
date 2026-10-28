/**
 * Payslip sign-off by a Disbursement Officer (2026-10-28, payroll manager
 * request). Approving stores the signer's name, a PNG signature drawn on the
 * sign-off canvas, the time and an optional note, and freezes the payslip:
 * regenerate, edit and delete answer 409 until the approval is revoked.
 * Only payslips in a draft period are approved or revoked, and a signer never
 * signs off (or revokes) their own payslip. Every check is part of the write
 * itself, so a period locked or a payslip approved mid-request is refused.
 * Who may sign is checked by the routes (canSignDisbursement).
 * Contract: docs/payroll-time-v2-spec.md, "Disbursement sign-off".
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { config } from '../config/env.config'
import { PayrollConflictError, PayrollForbiddenError, PayrollNotFoundError, PayrollValidationError } from './payroll.errors'
import { payrollDayKey, roundMoney } from './payroll.calculations'
import { RosterSnapshotService, rosterSnapshotService } from './roster-snapshot.service'

export const APPROVAL_APPROVED = 'approved'
export const APPROVAL_DRAFT = 'draft'
/** The stored data URL, in bytes (ASCII), not the decoded image. */
export const MAX_SIGNATURE_BYTES = 64 * 1024
export const SIGNER_NAME_MIN_LENGTH = 2
export const SIGNER_NAME_MAX_LENGTH = 80
export const APPROVAL_NOTE_MAX_LENGTH = 500

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'
// Base64 of the 8 PNG signature bytes plus the first bits of the IHDR length (always 0).
const PNG_BASE64_START = 'iVBORw0KGgo'
const BASE64_BODY = /^[A-Za-z0-9+/]+={0,2}$/

export const SIGNER_ONLY_MESSAGE = 'Only a disbursement officer or an admin can sign off payslips.'
export const ALREADY_APPROVED_MESSAGE = 'This payslip is already approved for disbursement.'
export const NOT_APPROVED_MESSAGE = 'This payslip is not approved, so there is nothing to revoke.'
export const OWN_APPROVAL_MESSAGE = 'You cannot sign off your own payslip. Ask another disbursement officer or an admin.'
export const OWN_EDIT_APPROVAL_MESSAGE = 'You edited this payslip; another officer or an admin must sign it.'
export const SIGNATURE_MESSAGE = 'Draw or type a signature before signing.'
export const SIGNATURE_TOO_LARGE_MESSAGE = 'The signature image is larger than 64 KB. Clear it and sign again.'
export const SIGNER_NAME_MESSAGE = `Enter the signer's name, ${SIGNER_NAME_MIN_LENGTH} to ${SIGNER_NAME_MAX_LENGTH} characters.`
export const APPROVAL_NOTE_MESSAGE = `Keep the note under ${APPROVAL_NOTE_MAX_LENGTH} characters.`
const LOCKED_PERIOD_MESSAGE = 'This payroll period is processed and locked. Payslips in it cannot be changed.'
const PERIOD_NOT_FOUND_MESSAGE = 'Payroll period not found'

export const CHANGED_MESSAGE = 'This payslip changed after you opened it. Check the new amounts and sign again.'
export const CHANGED_ALL_MESSAGE = 'Payslips in this period changed after you opened the dialog. Check the new totals and sign again.'
const CONCURRENT_MESSAGE = 'Someone changed these payslips at the same moment. Reload and sign again.'

export interface ApprovalInput {
    signerName?: unknown
    signature?: unknown
    note?: unknown
    /** The amounts the signer saw (single payslip); a mismatch answers 409. */
    expectedGrossPay?: unknown
    expectedNetPay?: unknown
    /** What the approve-all dialog showed; a mismatch answers 409. */
    expectedCount?: unknown
    expectedNet?: unknown
}

export interface ApproveAllResult {
    periodId: string
    /** Payslips approved by this request. */
    approved: number
    /** Payslips that were approved before. */
    alreadyApproved: number
    /** The signer's own payslip, left for another signer (0 or 1). */
    skippedOwn: number
    /** Payslips the signer edited by hand, left for another signer (review fix 2026-10-28). */
    skippedEdited: number
    total: number
}

export interface PeriodApprovalSummary {
    periodId: string
    periodStatus: string
    total: number
    approved: number
    unapproved: number
    /** What "Approve all" would sign for this requester (their own payslip and the ones they edited left out). */
    toApprove: { count: number; gross: number; net: number }
    /** The requester has an unapproved payslip in the period that someone else must sign. */
    ownPending: boolean
    /** Unapproved payslips the requester edited by hand; someone else must sign them. */
    editedPending: number
}

/** Who must sign which pending payslip: never their own, never one they edited (review fix 2026-10-28). */
function splitForSigner<T extends { userId: string; editedById: string | null }>(pending: T[], signerId: string) {
    const others = pending.filter((payslip) => payslip.userId !== signerId)
    const signable = others.filter((payslip) => payslip.editedById !== signerId)
    return { signable, skippedOwn: pending.length - others.length, skippedEdited: others.length - signable.length }
}

/** Trimmed, single-spaced name of 2 to 80 characters, else 400. */
export function normalizeSignerName(value: unknown): string {
    const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
    if (name.length < SIGNER_NAME_MIN_LENGTH || name.length > SIGNER_NAME_MAX_LENGTH) {
        throw new PayrollValidationError(SIGNER_NAME_MESSAGE)
    }
    return name
}

/** A PNG data URL of at most 64 KB (400 when missing, malformed or larger). */
export function normalizeSignature(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith(PNG_DATA_URL_PREFIX)) throw new PayrollValidationError(SIGNATURE_MESSAGE)
    if (value.length > MAX_SIGNATURE_BYTES) throw new PayrollValidationError(SIGNATURE_TOO_LARGE_MESSAGE)
    const body = value.slice(PNG_DATA_URL_PREFIX.length)
    if (!body.startsWith(PNG_BASE64_START) || !BASE64_BODY.test(body)) throw new PayrollValidationError(SIGNATURE_MESSAGE)
    return value
}

/** Optional note: null when blank, at most 500 characters. */
export function normalizeApprovalNote(value: unknown): string | null {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') throw new PayrollValidationError(APPROVAL_NOTE_MESSAGE)
    const note = value.trim()
    if (note.length > APPROVAL_NOTE_MAX_LENGTH) throw new PayrollValidationError(APPROVAL_NOTE_MESSAGE)
    return note || null
}

/** undefined when not sent, else a finite number (400 otherwise). */
export function parseExpectedAmount(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined
    const amount = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(amount)) throw new PayrollValidationError('Expected amounts must be numbers.')
    return amount
}

function errorCode(error: unknown): unknown {
    return typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
}

function approvalData(signerId: string, input: ApprovalInput) {
    return {
        approvalStatus: APPROVAL_APPROVED,
        approvedById: signerId,
        approvedAt: new Date(),
        approvalSignerName: normalizeSignerName(input.signerName),
        approvalSignature: normalizeSignature(input.signature),
        approvalNote: normalizeApprovalNote(input.note),
    }
}

type Db = Prisma.TransactionClient

/**
 * Payslips the signer did not edit by hand (review fix 2026-10-28): whoever
 * edited a payslip never signs it. Spelled out with the null case because a
 * plain `not` would leave out payslips nobody edited.
 */
function notEditedBy(signerId: string): Prisma.PayslipWhereInput {
    return { OR: [{ editedById: null }, { editedById: { not: signerId } }] }
}

export class PayslipApprovalService {
    /** Employee history (2026-10-28): captured after every sign-off change; replaced in tests. */
    roster: Pick<RosterSnapshotService, 'captureSafely'> = rosterSnapshotService

    constructor(private readonly db: PrismaClient = prisma) { }

    /** Records the payslip's new status in the employee history (never throws). */
    private async recordHistory<T extends { periodId: string; userId: string }>(payslip: T | null): Promise<T | null> {
        if (payslip) await this.roster.captureSafely(payslip.periodId, [payslip.userId])
        return payslip
    }

    /** Explains why a conditional write matched no row (404, 403 or 409). */
    private async refusal(db: Db, payslipId: string, signerId: string, action: 'approve' | 'revoke'): Promise<Error> {
        const payslip = await db.payslip.findUnique({
            where: { id: payslipId },
            select: { userId: true, approvalStatus: true, editedById: true, period: { select: { status: true } } },
        })
        if (!payslip) return new PayrollNotFoundError('Payslip not found')
        if (payslip.userId === signerId) return new PayrollForbiddenError(OWN_APPROVAL_MESSAGE)
        if (payslip.period.status !== 'draft') return new PayrollConflictError(LOCKED_PERIOD_MESSAGE)
        if (action === 'approve' && payslip.editedById === signerId && payslip.approvalStatus !== APPROVAL_APPROVED) {
            return new PayrollForbiddenError(OWN_EDIT_APPROVAL_MESSAGE)
        }
        if (action === 'revoke') return new PayrollConflictError(NOT_APPROVED_MESSAGE)
        // Still open for sign-off, so the amounts the signer saw no longer match.
        return new PayrollConflictError(payslip.approvalStatus === APPROVAL_APPROVED ? ALREADY_APPROVED_MESSAGE : CHANGED_MESSAGE)
    }

    /**
     * Signs one payslip. With expectedGrossPay / expectedNetPay (the sign-off
     * dialog sends both) the write only lands on those exact amounts, so a
     * payslip regenerated or edited while the signer looked at it is refused.
     */
    async approvePayslip(payslipId: string, signerId: string, input: ApprovalInput) {
        const data = approvalData(signerId, input)
        const grossPay = parseExpectedAmount(input.expectedGrossPay)
        const netPay = parseExpectedAmount(input.expectedNetPay)
        const approved = await this.db.$transaction(async (tx) => {
            const claimed = await tx.payslip.updateMany({
                where: {
                    id: payslipId,
                    userId: { not: signerId },
                    approvalStatus: { not: APPROVAL_APPROVED },
                    period: { status: 'draft' },
                    ...notEditedBy(signerId),
                    ...(grossPay !== undefined ? { grossPay } : {}),
                    ...(netPay !== undefined ? { netPay } : {}),
                },
                data,
            })
            if (claimed.count === 0) throw await this.refusal(tx, payslipId, signerId, 'approve')
            return tx.payslip.findUnique({ where: { id: payslipId }, include: { items: true, period: true } })
        })
        return this.recordHistory(approved)
    }

    /** Clears the sign-off and records who revoked it, and when, in approvalNote. */
    async revokeApproval(payslipId: string, signerId: string) {
        const signer = await this.db.user.findUnique({ where: { id: signerId }, select: { name: true, email: true } })
        const who = signer?.name?.trim() || signer?.email || 'a signer'
        const note = `Approval revoked by ${who} on ${payrollDayKey(new Date(), config.payrollTimezone)}`
        const revoked = await this.db.$transaction(async (tx) => {
            const claimed = await tx.payslip.updateMany({
                where: { id: payslipId, userId: { not: signerId }, approvalStatus: APPROVAL_APPROVED, period: { status: 'draft' } },
                data: {
                    approvalStatus: APPROVAL_DRAFT,
                    approvedById: null,
                    approvedAt: null,
                    approvalSignerName: null,
                    approvalSignature: null,
                    approvalNote: note,
                },
            })
            if (claimed.count === 0) throw await this.refusal(tx, payslipId, signerId, 'revoke')
            return tx.payslip.findUnique({ where: { id: payslipId }, include: { items: true, period: true } })
        })
        return this.recordHistory(revoked)
    }

    /**
     * Signs every unapproved payslip of a draft period (not the signer's own,
     * not one the signer edited) with one signature. Serializable: with
     * expectedCount / expectedNet (the dialog sends both) the set signed is
     * exactly the one the signer saw, and a payslip changed meanwhile makes the
     * whole request answer 409.
     */
    async approveAll(periodId: string, signerId: string, input: ApprovalInput): Promise<ApproveAllResult> {
        const data = approvalData(signerId, input)
        const expectedCount = parseExpectedAmount(input.expectedCount)
        const expectedNet = parseExpectedAmount(input.expectedNet)
        try {
            const result = await this.db.$transaction(async (tx) => {
                const period = await tx.payrollPeriod.findUnique({ where: { id: periodId }, select: { status: true } })
                if (!period) throw new PayrollNotFoundError(PERIOD_NOT_FOUND_MESSAGE)
                if (period.status !== 'draft') throw new PayrollConflictError(LOCKED_PERIOD_MESSAGE)
                const payslips = await tx.payslip.findMany({
                    where: { periodId },
                    select: { id: true, userId: true, approvalStatus: true, netPay: true, editedById: true },
                })
                const pending = payslips.filter((payslip) => payslip.approvalStatus !== APPROVAL_APPROVED)
                const { signable, skippedOwn, skippedEdited } = splitForSigner(pending, signerId)
                const net = roundMoney(signable.reduce((sum, payslip) => sum + payslip.netPay, 0))
                if ((expectedCount !== undefined && expectedCount !== signable.length) || (expectedNet !== undefined && expectedNet !== net)) {
                    throw new PayrollConflictError(CHANGED_ALL_MESSAGE)
                }
                const signed = await tx.payslip.updateMany({
                    where: {
                        id: { in: signable.map((payslip) => payslip.id) },
                        approvalStatus: { not: APPROVAL_APPROVED },
                        ...notEditedBy(signerId),
                    },
                    data,
                })
                return {
                    periodId,
                    approved: signed.count,
                    alreadyApproved: payslips.length - pending.length,
                    skippedOwn,
                    skippedEdited,
                    total: payslips.length,
                }
            }, { isolationLevel: 'Serializable' })
            // captureSafely never throws, so a history failure is never read as a lost race.
            if (result.approved > 0) await this.roster.captureSafely(periodId)
            return result
        } catch (error) {
            if (errorCode(error) === 'P2034') throw new PayrollConflictError(CONCURRENT_MESSAGE)
            throw error
        }
    }

    /** Counts and totals for the period header, the approve-all dialog and the lock prompt. */
    async periodSummary(periodId: string, requesterId: string): Promise<PeriodApprovalSummary> {
        const period = await this.db.payrollPeriod.findUnique({ where: { id: periodId }, select: { status: true } })
        if (!period) throw new PayrollNotFoundError(PERIOD_NOT_FOUND_MESSAGE)
        const payslips = await this.db.payslip.findMany({
            where: { periodId },
            select: { userId: true, approvalStatus: true, grossPay: true, netPay: true, editedById: true },
        })
        const pending = payslips.filter((payslip) => payslip.approvalStatus !== APPROVAL_APPROVED)
        // The same split as approveAll, so the dialog's expected count and net match it.
        const { signable, skippedOwn, skippedEdited } = splitForSigner(pending, requesterId)
        return {
            periodId,
            periodStatus: period.status,
            total: payslips.length,
            approved: payslips.length - pending.length,
            unapproved: pending.length,
            toApprove: {
                count: signable.length,
                gross: roundMoney(signable.reduce((sum, payslip) => sum + payslip.grossPay, 0)),
                net: roundMoney(signable.reduce((sum, payslip) => sum + payslip.netPay, 0)),
            },
            ownPending: skippedOwn > 0,
            editedPending: skippedEdited,
        }
    }
}

export const payslipApprovalService = new PayslipApprovalService()
