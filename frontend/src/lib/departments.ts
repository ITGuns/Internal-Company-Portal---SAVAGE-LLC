/**
 * Centralized department list based on organizational structure
 * Use this across all pages for consistency
 */

// Top-level departments matching organizational chart (red boxes)
export const DEPARTMENTS = [
  'All Departments',
  'Owners / Founders',
  'Project Management',
  'Operations',
  'Digital Marketing',
  'Analytics / Data',
  'Automation / Tech',
  'Website Developers',
  'Payroll / Finance',
] as const;

export type Department = typeof DEPARTMENTS[number];

/**
 * Roles available under each Department (black boxes in org chart)
 * These will populate the "Role" dropdown when a Department is selected.
 */
export const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Owners / Founders': [
    'Owner / Founder',
  ],
  'Project Management': [
    'Project Manager',
  ],
  'Operations': [
    'Operations Manager',
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA',
  ],
  'Digital Marketing': [
    'Digital Marketing Lead / Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA',
  ],
  'Analytics / Data': [
    'Analytics / Data VA',
  ],
  'Automation / Tech': [
    'Automation / Tech VA',
  ],
  'Website Developers': [
    'Frontend Developer',
    'Backend / Technical Developer',
  ],
  'Payroll / Finance': [
    'Bookkeeping',
    'Contractor & Salary Payments',
  ],
};

