// Deskii's own subscription plans, shown on /upgrade.
//
// These price DESKII ITSELF - what a company pays to use the product. They are
// NOT the Gemfield website-build packages ($497-$9,997/mo), which live in the
// backend as CLIENT_SERVICE_TIER_PRESETS and describe an agency service a client
// buys. Two separate ladders. This file used to hold the website packages, which
// meant someone who had just signed up with Google was shown a $9,997/mo managed
// growth system when all they wanted was a $29 team plan.
//
// Mirrors backend/src/billing/deskii-plans.ts. Kept static so /upgrade renders
// for any signed-in account without a client-scoped API call - a free-tier
// account has no client organization to scope to.
//
// Source: Deskii Pricing Tier Strategy, Revision 2 (June 2026).

export type PricingPlan = {
  slug: string;
  name: string;
  /** USD per month. 0 for Free; null for Enterprise, which is negotiated. */
  monthlyPrice: number | null;
  tagline: string;
  features: string[];
  highlight?: boolean;
  /** Sales-led rather than self-serve. */
  custom?: boolean;
  /** Fraction off when billed yearly, e.g. 0.18. */
  annualDiscount?: number;
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    tagline: 'Try Deskii on your own work, at no cost.',
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
    tagline: 'For a freelancer with one other person.',
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
    tagline: 'A small team sharing work in one place.',
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
    highlight: true,
    annualDiscount: 0.18,
    tagline: 'Run payroll and HR alongside the work.',
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
    annualDiscount: 0.18,
    tagline: 'No seat ceiling, deeper payroll, your own database.',
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
    custom: true,
    tagline: 'Isolated infrastructure, SSO, and an SLA.',
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
];

export const UPGRADE_CONTACT_EMAIL = 'it3.digitalconnections@gmail.com';

/** "$29", "Free", or "Custom" — never "$null". */
export function formatPlanPrice(monthlyPrice: number | null): string {
  if (monthlyPrice === null) return 'Custom';
  if (monthlyPrice === 0) return 'Free';
  return `$${monthlyPrice.toLocaleString('en-US')}`;
}

/** Monthly-equivalent when billed yearly, or null if the plan has no annual option. */
export function annualMonthlyPrice(plan: PricingPlan): number | null {
  if (!plan.annualDiscount || plan.monthlyPrice === null) return null;
  return Math.round(plan.monthlyPrice * (1 - plan.annualDiscount) * 100) / 100;
}

export function planInquiryMailto(plan: PricingPlan): string {
  const subject = encodeURIComponent(`Upgrade request: ${plan.name}`);
  const body = encodeURIComponent(
    `Hi, I'd like to upgrade my Deskii account to the ${plan.name} plan (${formatPlanPrice(plan.monthlyPrice)}/mo). Please help me get started.`,
  );
  return `mailto:${UPGRADE_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
