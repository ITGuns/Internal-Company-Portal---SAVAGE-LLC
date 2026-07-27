// Schema-driven wizard config. Adding a category or a narrowing option is a config change here,
// not a code change in the wizard component. Bump GEMFIELD_WIZARD_VERSION when the shape changes;
// it is stored on the ticket (sourceWizardVersion) so submissions stay interpretable over time.

export const GEMFIELD_WIZARD_VERSION = 'v2';

export interface WizardOption {
  value: string;
  label: string;
}

export interface WizardNarrowField {
  id: string; // becomes a key in wizardAnswers
  label: string;
  options: WizardOption[];
  /** When true, the page list is augmented with the client's actual project pages at runtime. */
  fromProjectPages?: boolean;
}

export interface WizardCategory {
  value: string;
  label: string;
  description: string;
  narrow: WizardNarrowField[];
}

const PAGE_OPTIONS: WizardOption[] = [
  { value: 'home', label: 'Home' },
  { value: 'about', label: 'About' },
  { value: 'services', label: 'Services' },
  { value: 'contact', label: 'Contact' },
  { value: 'faq', label: 'FAQ' },
  { value: 'other', label: 'Another page' },
];

const CHANGE_TYPE_OPTIONS: WizardOption[] = [
  { value: 'text', label: 'Text / copy' },
  { value: 'images', label: 'Images' },
  { value: 'add_section', label: 'Add a section' },
  { value: 'new_page', label: 'A new page' },
  { value: 'design', label: 'Design tweak' },
  { value: 'contact_hours', label: 'Contact / hours update' },
];

const BROKEN_OPTIONS: WizardOption[] = [
  { value: 'wont_load', label: "Won't load" },
  { value: 'mobile', label: 'Looks wrong on my phone' },
  { value: 'form', label: 'A form is not working' },
  { value: 'wrong_info', label: 'Wrong information' },
  { value: 'other', label: 'Something else' },
];

const SUPPORT_TOPICS: WizardOption[] = [
  { value: 'how_to', label: 'How do I…?' },
  { value: 'account', label: 'My account / access' },
  { value: 'domain_email', label: 'Domain or email' },
  { value: 'other', label: 'Something else' },
];

const BILLING_TOPICS: WizardOption[] = [
  { value: 'invoice', label: 'An invoice' },
  { value: 'payment', label: 'A payment' },
  { value: 'plan', label: 'My plan' },
  { value: 'other', label: 'Something else' },
];

export const GEMFIELD_WIZARD_CATEGORIES: WizardCategory[] = [
  {
    value: 'website_change',
    label: 'Change to my website',
    description: 'Update text, swap an image, add a section, and more.',
    narrow: [
      { id: 'page', label: 'Which page?', options: PAGE_OPTIONS, fromProjectPages: true },
      { id: 'changeType', label: 'What kind of change?', options: CHANGE_TYPE_OPTIONS },
    ],
  },
  {
    value: 'broken',
    label: "Something's broken on my site",
    description: 'A page or feature is not working the way it should.',
    narrow: [
      { id: 'problem', label: "What's wrong?", options: BROKEN_OPTIONS },
      { id: 'where', label: 'Where is it?', options: PAGE_OPTIONS, fromProjectPages: true },
    ],
  },
  {
    value: 'support',
    label: 'Question / support',
    description: 'Ask us anything about your site.',
    narrow: [{ id: 'topic', label: 'What is it about?', options: SUPPORT_TOPICS }],
  },
  {
    value: 'billing',
    label: 'Billing',
    description: 'Invoices, payments, or your plan.',
    narrow: [{ id: 'topic', label: 'What is it about?', options: BILLING_TOPICS }],
  },
  {
    value: 'other',
    label: 'Something else',
    description: "Not sure where it fits? Tell us in your own words.",
    narrow: [],
  },
];

export function getWizardCategory(value: string): WizardCategory | undefined {
  return GEMFIELD_WIZARD_CATEGORIES.find((category) => category.value === value);
}
