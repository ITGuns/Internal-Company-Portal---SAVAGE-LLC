/**
 * Centralized department list based on organizational structure
 * Use this across all pages for consistency
 */

// Top-level departments matching database
export const DEPARTMENTS = [
  'Project Managers',
  'Website Developers',
  'Payroll / Finance'
] as const;

export type Department = typeof DEPARTMENTS[number];

/**
 * Roles and Sub-departments available under each Top-Level Department
 * These will populate the "Role" dropdown when a Department is selected.
 */
export const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Project Managers': [
    'Operations Manager',
    'Digital Marketing Lead / Marketing VA',
    'Analytics / Data VA',
    'Automation / Tech VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA',
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA'
  ],
  'Website Developers': [
    'Frontend Developer',
    'Backend / Technical Developer'
  ],
  'Payroll / Finance': [
    'Bookkeeping',
    'Contractor & Salary Payments'
  ],
};

// Deprecated hierarchy structure removed to simplify data flow.
// If restored, ensure it matches DEPARTMENTS exactly.

