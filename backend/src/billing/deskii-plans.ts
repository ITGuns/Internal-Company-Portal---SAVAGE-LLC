// Deskii's own subscription plans - what a company pays to USE Deskii.
//
// Not to be confused with ClientServiceTier (client-service-tier-presets.ts),
// which prices website builds for Gemfield clients at $497-$9,997/mo. Two
// separate ladders that both used to be called "tiers": a Gemfield client paying
// for a managed growth system is not on a $29 Starter plan, and nothing here
// should ever be written to ClientOrganization.tierId.
//
// Source: Deskii Pricing Tier Strategy, Revision 2 (June 2026).
//
// Defined on the backend so prices and limits are resolved server-side. The
// client sends a slug and nothing else - a plan's price must never arrive from
// a request body.

export interface DeskiiPlan {
  /** Stable key shared with the frontend. Never match on the display name. */
  slug: string
  name: string
  /** USD per month. 0 for Free; null for Enterprise, which is negotiated. */
  monthlyPrice: number | null
  tagline: string
  /** Ascending, so a higher rank is a bigger plan. */
  rank: number
  /** null means unlimited. */
  seats: number | null
  activeProjects: number | null
  /** Megabytes; 0 = no file storage on this plan. */
  storageMb: number | null
  /** Sales-led rather than self-serve. */
  custom?: boolean
  /** Fraction off when billed yearly, e.g. 0.18. */
  annualDiscount?: number
  features: string[]
}

export const DESKII_PLANS: readonly DeskiiPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    rank: 0,
    tagline: 'Try Deskii on your own work, at no cost.',
    seats: 1,
    activeProjects: 5,
    storageMb: 0,
    features: [
      '1 seat',
      '5 active projects',
      'Personal task tracking',
      'Daily log submission',
      'Self-serve support',
    ],
  },
  {
    slug: 'solo',
    name: 'Solo',
    monthlyPrice: 9,
    rank: 10,
    tagline: 'For a freelancer with one other person.',
    seats: 2,
    activeProjects: 15,
    storageMb: 0,
    features: [
      '2 seats',
      '15 active projects',
      'Full task tracking',
      'Your own daily logs',
      'Team chat',
    ],
  },
  {
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    rank: 20,
    tagline: 'A small team sharing work in one place.',
    seats: 5,
    activeProjects: 50,
    storageMb: 500,
    features: [
      '5 seats (add up to 8 at $5 each)',
      '50 active projects',
      '500 MB file storage',
      'Daily logs across all staff',
      'Payroll calendar + payslip view',
      'Basic employee records',
      'Standard support',
    ],
  },
  {
    slug: 'professional',
    name: 'Professional',
    monthlyPrice: 49,
    rank: 30,
    tagline: 'Run payroll and HR alongside the work.',
    seats: 15,
    activeProjects: null,
    storageMb: 5120,
    annualDiscount: 0.18,
    features: [
      '15 seats',
      'Unlimited projects',
      '5 GB file storage',
      'Full payroll + payslip PDFs',
      'Full employee management',
      'Daily log heatmaps',
      'Priority email support',
    ],
  },
  {
    slug: 'business',
    name: 'Business',
    monthlyPrice: 79,
    rank: 40,
    tagline: 'No seat ceiling, deeper payroll, your own database.',
    seats: null,
    activeProjects: null,
    storageMb: 25600,
    annualDiscount: 0.18,
    features: [
      'Unlimited seats',
      '25 GB file storage',
      'Dedicated database',
      'Advanced payroll rules + deductions',
      'Daily log analytics',
      'Read API access',
      'Priority chat + email support',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    rank: 50,
    custom: true,
    tagline: 'Isolated infrastructure, SSO, and an SLA.',
    seats: null,
    activeProjects: null,
    storageMb: null,
    features: [
      'Unlimited seats and storage',
      'Isolated infrastructure',
      'SSO / SAML',
      'Full API + webhooks',
      'Audit logs',
      'Custom payroll compliance',
      'SLA + dedicated CSM',
    ],
  },
]

/** Resolve by slug. Returns null for anything unknown. */
export function findDeskiiPlan(slug: string): DeskiiPlan | null {
  const wanted = String(slug || '').trim().toLowerCase()
  return DESKII_PLANS.find((plan) => plan.slug === wanted) ?? null
}

/** Plans a customer can buy without talking to sales. */
export function getSelfServePlans(): DeskiiPlan[] {
  return DESKII_PLANS.filter((plan) => !plan.custom && (plan.monthlyPrice ?? 0) > 0)
}

/** Monthly-equivalent price when billed yearly, or null if no annual option. */
export function annualMonthlyPrice(plan: DeskiiPlan): number | null {
  if (!plan.annualDiscount || plan.monthlyPrice === null) return null
  return Math.round(plan.monthlyPrice * (1 - plan.annualDiscount) * 100) / 100
}
