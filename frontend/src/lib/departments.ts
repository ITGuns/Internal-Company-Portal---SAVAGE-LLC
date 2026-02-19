/**
 * Centralized department list based on organizational structure
 * Use this across all pages for consistency
 */

// Top-level departments matching organizational chart (red boxes)
export const DEPARTMENTS = [
  'Website Developers',
  'Operations Manager',
  'Payroll / Finance',
  'Digital Marketing Lead / Marketing VA',
  'Analytics / Data VA',
  'Automation / Tech VA'
] as const;

export type Department = typeof DEPARTMENTS[number];

/**
 * Roles available under each Department (black boxes in org chart)
 * These will populate the "Role" dropdown when a Department is selected.
 */
export const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Website Developers': [
    'Frontend Developer',
    'Backend / Technical Developer'
  ],
  'Operations Manager': [
    'Operations Manager',
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA'
  ],
  'Payroll / Finance': [
    'Bookkeeping',
    'Contractor & Salary Payments'
  ],
  'Digital Marketing Lead / Marketing VA': [
    'Digital Marketing Lead',
    'Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA'
  ],
  'Analytics / Data VA': [
    'Analytics / Data VA'
  ],
  'Automation / Tech VA': [
    'Automation / Tech VA'
  ]
};

