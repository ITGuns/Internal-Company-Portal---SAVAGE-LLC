// Upgrade plans shown on the /upgrade page.
// Prices + names mirror the backend CLIENT_SERVICE_TIER_PRESETS
// (backend/src/clients/client-service-tier-presets.ts) so the two stay aligned.
// Kept as a static list so the page renders for any signed-in account without a
// client-scoped API call (free-tier accounts have no client org yet).

export type PricingPlan = {
  slug: string;
  name: string;
  monthlyPrice: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    slug: 'standard',
    name: 'Standard Business Website',
    monthlyPrice: 497,
    tagline: 'A polished site to get your business online.',
    features: [
      'Final website included',
      'Mobile-friendly design',
      'Core business pages',
      'Contact form',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth Business Website',
    monthlyPrice: 997,
    tagline: 'Turn visitors into leads.',
    features: [
      'Everything in Standard',
      'Stronger site structure',
      'Lead capture',
      'Reviews & social proof',
      'Conversion-focused sections',
    ],
  },
  {
    slug: 'conversion',
    name: 'Conversion & Local Growth System',
    monthlyPrice: 2997,
    tagline: 'Get found locally and convert more.',
    highlight: true,
    features: [
      'Everything in Growth',
      'More pages',
      'Local SEO structure',
      'Analytics setup',
      'Stronger content & funnel path',
    ],
  },
  {
    slug: 'managed',
    name: 'Managed Growth Website System',
    monthlyPrice: 4997,
    tagline: 'Hands-off growth, managed for you.',
    features: [
      'Everything in Conversion & Local',
      'Automations & reporting',
      'Workflow support',
      'Part-time manager included',
    ],
  },
  {
    slug: 'premium',
    name: 'Premium Managed Growth System',
    monthlyPrice: 9997,
    tagline: 'Your full growth team + custom systems.',
    features: [
      'Everything in Managed Growth',
      'Dedicated manager support',
      'Custom systems as approved',
      'Priority delivery',
    ],
  },
];

export const UPGRADE_CONTACT_EMAIL = 'it3.digitalconnections@gmail.com';

export function formatPlanPrice(monthlyPrice: number): string {
  return `$${monthlyPrice.toLocaleString('en-US')}`;
}

export function planInquiryMailto(plan: PricingPlan): string {
  const subject = encodeURIComponent(`Upgrade request: ${plan.name}`);
  const body = encodeURIComponent(
    `Hi, I'd like to upgrade my Deskii account to the ${plan.name} plan (${formatPlanPrice(plan.monthlyPrice)}/mo). Please help me get started.`,
  );
  return `mailto:${UPGRADE_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
