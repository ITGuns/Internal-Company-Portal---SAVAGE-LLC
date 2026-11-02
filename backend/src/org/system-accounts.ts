import type { Prisma } from '@prisma/client'

/**
 * System accounts are technical sign-ins, not people. The bootstrap admin
 * (admin@savage.com, "Savage Admin") keeps every permission its role rows give
 * it, but it is left out of the member lists: GET /api/users, GET /api/users/search
 * and GET /api/org-chart. Sign-in, GET /api/users/:id and every access check
 * ignore this list.
 *
 * SYSTEM_ACCOUNT_EMAILS overrides the default with comma separated addresses;
 * an empty value hides nobody. Kept apart from ADMIN_EMAILS, which may name
 * real people.
 */
const DEFAULT_SYSTEM_ACCOUNT_EMAILS = ['admin@savage.com']

/** Lowercased system account addresses. Read on every call, so tests can switch it. */
export function getSystemAccountEmails(): string[] {
  const configured = process.env.SYSTEM_ACCOUNT_EMAILS
  if (configured === undefined) return [...DEFAULT_SYSTEM_ACCOUNT_EMAILS]

  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isSystemAccountEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return getSystemAccountEmails().includes(email.trim().toLowerCase())
}

/** User filter that leaves system accounts out; spread it into a Prisma `where`. */
export function excludeSystemAccounts(): Prisma.UserWhereInput {
  const emails = getSystemAccountEmails()
  if (emails.length === 0) return {}
  return { NOT: { email: { in: emails, mode: 'insensitive' } } }
}
