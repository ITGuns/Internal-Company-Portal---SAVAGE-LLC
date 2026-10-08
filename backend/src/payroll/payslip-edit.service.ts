import type { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import {
    PayrollConflictError,
    PayrollForbiddenError,
    PayrollNotFoundError,
    PayrollValidationError,
} from './payroll.errors'
import { roundMoney } from './payroll.calculations'

/**
 * Payslip edit and delete (payroll v2, Rule 5). Only payslips in a draft
 * period change; processed periods answer 409.
 */

export const PAYROLL_ITEM_TYPES = [
    'regular_hours',
    'fixed_salary',
    'overtime_approved',
    'overtime_pending',
    'allowance',
    'deduction',
    'adjustment',
] as const

export type PayrollItemType = typeof PAYROLL_ITEM_TYPES[number]

export interface PayslipItemInput {
    type: PayrollItemType
    description: string
    amount: number
}

const MAX_ITEMS = 50
const MAX_DESCRIPTION_LENGTH = 200
const MAX_NOTE_LENGTH = 500
const LOCKED_PERIOD_MESSAGE = 'This payroll period is processed and locked. Payslips in it cannot be changed.'
export const OWN_PAYSLIP_MESSAGE = 'You cannot change your own payslip. Ask another payroll manager.'

function isItemType(value: unknown): value is PayrollItemType {
    return typeof value === 'string' && (PAYROLL_ITEM_TYPES as readonly string[]).includes(value)
}

/**
 * Validate and normalize line items. Deductions are always stored negative and
 * overtime_pending is informational (amount 0).
 */
export function normalizePayslipItems(input: unknown): PayslipItemInput[] {
    if (!Array.isArray(input) || input.length === 0) {
        throw new PayrollValidationError('At least one line item is required')
    }
    if (input.length > MAX_ITEMS) {
        throw new PayrollValidationError(`A payslip can have at most ${MAX_ITEMS} line items`)
    }

    return input.map((raw, index) => {
        const item = (raw || {}) as Record<string, unknown>
        const position = index + 1
        if (!isItemType(item.type)) {
            throw new PayrollValidationError(`Line ${position} has an unknown type`)
        }
        const description = typeof item.description === 'string' ? item.description.trim() : ''
        if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
            throw new PayrollValidationError(`Line ${position} needs a description of up to ${MAX_DESCRIPTION_LENGTH} characters`)
        }
        const amount = typeof item.amount === 'number' ? item.amount : Number(item.amount)
        if (!Number.isFinite(amount)) {
            throw new PayrollValidationError(`Line ${position} needs a numeric amount`)
        }

        const normalizedAmount = item.type === 'deduction'
            ? -Math.abs(amount)
            : item.type === 'overtime_pending' ? 0 : amount
        return { type: item.type, description, amount: roundMoney(normalizedAmount) }
    })
}

/** Gross = every non-deduction amount; net = sum of all amounts. */
export function computePayslipTotals(items: readonly { type: string; amount: number }[]) {
    const grossPay = items
        .filter((item) => item.type !== 'deduction')
        .reduce((sum, item) => sum + item.amount, 0)
    const netPay = items.reduce((sum, item) => sum + item.amount, 0)
    return { grossPay: roundMoney(grossPay), netPay: roundMoney(netPay) }
}

export function normalizeEditNote(input: unknown): string {
    const note = typeof input === 'string' ? input.trim() : ''
    if (!note) throw new PayrollValidationError('A note explaining the change is required')
    if (note.length > MAX_NOTE_LENGTH) {
        throw new PayrollValidationError(`The note can be at most ${MAX_NOTE_LENGTH} characters`)
    }
    return note
}

/** Rows a conditional write may touch: draft period, someone else's payslip. */
function editableWhere(payslipId: string, requesterId: string): Prisma.PayslipWhereInput {
    return { id: payslipId, userId: { not: requesterId }, period: { status: 'draft' } }
}

export class PayslipEditService {
    /** Explains why a conditional write matched no row (404, 403 or 409). */
    private async refusal(client: Prisma.TransactionClient, payslipId: string, requesterId: string): Promise<Error> {
        const payslip = await client.payslip.findUnique({
            where: { id: payslipId },
            select: { userId: true, period: { select: { status: true } } },
        })
        if (!payslip) return new PayrollNotFoundError('Payslip not found')
        if (payslip.userId === requesterId) return new PayrollForbiddenError(OWN_PAYSLIP_MESSAGE)
        return new PayrollConflictError(LOCKED_PERIOD_MESSAGE)
    }

    async editPayslip(payslipId: string, editorId: string, body: { items?: unknown; note?: unknown }) {
        const items = normalizePayslipItems(body.items)
        const note = normalizeEditNote(body.note)
        const totals = computePayslipTotals(items)

        return prisma.$transaction(async (tx) => {
            // The lock and self checks are part of the write itself, so a period
            // processed mid-request cannot be edited.
            const claimed = await tx.payslip.updateMany({
                where: editableWhere(payslipId, editorId),
                data: {
                    grossPay: totals.grossPay,
                    netPay: totals.netPay,
                    editedById: editorId,
                    editedAt: new Date(),
                    editNote: note,
                },
            })
            if (claimed.count === 0) throw await this.refusal(tx, payslipId, editorId)

            await tx.payrollItem.deleteMany({ where: { payslipId } })
            await tx.payrollItem.createMany({ data: items.map((item) => ({ ...item, payslipId })) })
            return tx.payslip.findUnique({
                where: { id: payslipId },
                include: { items: true, period: true },
            })
        })
    }

    async deletePayslip(payslipId: string, requesterId: string) {
        await prisma.$transaction(async (tx) => {
            const removed = await tx.payslip.deleteMany({ where: editableWhere(payslipId, requesterId) })
            if (removed.count === 0) throw await this.refusal(tx, payslipId, requesterId)
        })
    }
}
