/**
 * Centralized department list based on organizational structure
 * Use this across all pages for consistency
 */

// Top-level departments matching organizational chart (red boxes)
export const DEPARTMENTS = [
  'All Departments',
  'Website Developers',
  'Operations Manager',
  'Payroll / Finance',
  'Digital Marketing Lead / Marketing VA',
  'Analytics / Data VA',
  'Automation / Tech VA',
  'Project Managers'
] as const;

export type Department = typeof DEPARTMENTS[number];

/**
 * Roles available under each Department (black boxes in org chart)
 * These will populate the "Role" dropdown when a Department is selected.
 */
export const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Website Developers': [
    'Lead Frontend Developer',
    'Senior Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'App Developer',
    'Web Development Assistant'
  ],
  'Operations Manager': [
    'Operations Manager',
    'Operations Assistant',
    'Fulfillment Specialist',
    'Logistics Coordinator',
    'Inventory VA',
    'Customer Experience (CX) VA'
  ],
  'Payroll / Finance': [
    'Financial Controller',
    'Bookkeeper',
    'Payroll Assistant',
    'Contractor & Salary Payments'
  ],
  'Digital Marketing Lead / Marketing VA': [
    'Digital Marketing Lead',
    'Marketing Assistant',
    'Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA'
  ],
  'Analytics / Data VA': [
    'Data Analyst',
    'Analytics Specialist',
    'Data VA',
    'Analytics Assistant'
  ],
  'Automation / Tech VA': [
    'Automation Specialist',
    'Tech VA',
    'Integration Expert',
    'Automation Assistant'
  ],
  'Project Managers': [
    'Project Manager',
    'Project Assistant',
    'Team Lead',
    'SCRUM Master'
  ],
};

