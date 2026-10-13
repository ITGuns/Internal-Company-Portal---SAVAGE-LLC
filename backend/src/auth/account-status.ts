import { prisma } from '../database/prisma.service'
import { canLoginApprovedUser, getLoginRefusalMessage } from './signup.requests'

/**
 * Per-request account check for authenticateToken (payroll v2, Rule 6):
 * deactivated, unapproved or deleted users are refused even with a valid
 * access token. Results are cached briefly per process to keep the extra
 * query off the hot path; deactivate/reactivate clear the local entry, other
 * serverless instances pick the change up within ACCOUNT_STATUS_TTL_MS.
 */

export const ACCOUNT_STATUS_TTL_MS = 30_000

interface AccountState {
    status: string | null
    isApproved: boolean | null
}

export type AccountCheck =
    | { ok: true }
    | { ok: false; httpStatus: 401 | 403; message: string }

const cache = new Map<string, { state: AccountState | null; expiresAt: number }>()

export function clearAccountStatusCache(userId?: string): void {
    if (userId) {
        cache.delete(userId)
        return
    }
    cache.clear()
}

async function loadAccountState(userId: string, now: number): Promise<AccountState | null> {
    const cached = cache.get(userId)
    if (cached && cached.expiresAt > now) return cached.state

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, isApproved: true },
    })
    const state = user ? { status: user.status, isApproved: user.isApproved } : null
    cache.set(userId, { state, expiresAt: now + ACCOUNT_STATUS_TTL_MS })
    return state
}

/** Pure decision used by the middleware and its tests. */
export function evaluateAccountState(state: AccountState | null): AccountCheck {
    if (!state) return { ok: false, httpStatus: 401, message: 'User no longer exists' }
    if (!canLoginApprovedUser(state)) {
        return { ok: false, httpStatus: 403, message: getLoginRefusalMessage(state) }
    }
    return { ok: true }
}

export async function checkAccountStatus(userId: string, now = Date.now()): Promise<AccountCheck> {
    return evaluateAccountState(await loadAccountState(userId, now))
}
