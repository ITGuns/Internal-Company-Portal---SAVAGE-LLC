/**
 * Centralized department list based on organizational structure
 * Use this across all pages for consistency
 */

export const DEPARTMENTS = [
  'Owners / Founders',
  'Project Managers',
  'Website Developers',
  'Frontend Developer',
  'Backend / Technical Developer',
  'Payroll / Finance',
  'Bookkeeping',
  'Contractor & Salary Payments',
  'Operations Manager',
  'Fulfillment / Logistics VA',
  'Inventory VA',
  'Customer Experience (CX) VA',
  'Digital Marketing Lead / Marketing VA',
  'Media Buyer / Ads Specialist',
  'Content Creator / Designer',
  'Email & SMS Marketer',
  'Influencer / Social Media VA',
  'Analytics / Data VA',
  'Automation / Tech VA'
] as const;

export type Department = typeof DEPARTMENTS[number];

/**
 * Department hierarchy for navigation and organization
 * Each top-level department head can assign users to their roles/subroles
 */
export const DEPARTMENT_HIERARCHY = {
  'Owners / Founders': [
    'Project Managers',
    'Website Developers',
    'Payroll / Finance'
  ],
  'Project Managers': [
    'Operations Manager',
    'Digital Marketing Lead / Marketing VA',
    'Analytics / Data VA',
    'Automation / Tech VA'
  ],
  'Website Developers': [
    'Frontend Developer',
    'Backend / Technical Developer'
  ],
  'Payroll / Finance': [
    'Bookkeeping',
    'Contractor & Salary Payments'
  ],
  'Operations Manager': [
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA'
  ],
  'Digital Marketing Lead / Marketing VA': [
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA'
  ],
  'Analytics / Data VA': [],
  'Automation / Tech VA': []
} as const;

/**
 * Department and role groupings for dropdowns and navigation
 * Top-level departments with their associated roles/sub-departments
 * Department heads can assign users to roles listed under them
 */
export const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Owners / Founders': [
    'Project Managers',
    'Website Developers',
    'Payroll / Finance'
  ],
  'Project Managers': [
    'Operations Manager',
    'Digital Marketing Lead / Marketing VA',
    'Analytics / Data VA',
    'Automation / Tech VA'
  ],
  'Website Developers': [
    'Frontend Developer',
    'Backend / Technical Developer'
  ],
  'Payroll / Finance': [
    'Bookkeeping',
    'Contractor & Salary Payments'
  ],
  'Operations Manager': [
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA'
  ],
  'Digital Marketing Lead / Marketing VA': [
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA'
  ],
  'Analytics / Data VA': [],
  'Automation / Tech VA': []
};
