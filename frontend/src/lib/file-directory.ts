/**
 * File Directory Data Management
 * 
 * Handles file directory data, navigation, filtering, and localStorage persistence.
 * Mock data is based on the Company File Directory spreadsheet.
 * 
 * Backend Integration Notes:
 * - Replace helper functions with API calls when backend is ready
 * - See bottom of file for backend integration guide
 */

import type { FileDirectory } from './file-directory-types';

// ========== MOCK DATA (Based on Company File Directory Spreadsheet) ==========

export const MOCK_DIRECTORIES: FileDirectory[] = [
  // ===== OPERATIONS DIRECTORY =====
  {
    id: 'root-operations',
    name: 'OPERATIONS DIRECTORY',
    type: 'folder',
    department: 'Operations',
    parentId: null,
    driveLink: 'https://drive.google.com/drive/folders/operations-root',
  },
  // All the projects
  {
    id: 'ops-all-projects',
    name: 'All the projects',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-all-projects',
  },
  {
    id: 'ops-app-project-2026',
    name: 'App Project 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-all-projects',
    driveLink: 'https://drive.google.com/drive/folders/ops-app-project-2026',
  },
  {
    id: 'ops-ej-app',
    name: 'EJ App',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-app-project-2026',
    driveLink: 'https://drive.google.com/drive/folders/ops-ej-app',
  },
  // EJ
  {
    id: 'ops-ej',
    name: 'EJ',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-ej',
  },
  // File Directory
  {
    id: 'ops-file-directory',
    name: 'File Directory',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-file-directory',
  },
  // Finance
  {
    id: 'ops-finance',
    name: 'Finance',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-finance',
  },
  {
    id: 'ops-finance-reports',
    name: 'Financial Request Reports',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-finance',
    driveLink: 'https://drive.google.com/drive/folders/ops-finance-reports',
  },
  {
    id: 'ops-finance-forms',
    name: 'Request Forms',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-finance',
    driveLink: 'https://drive.google.com/drive/folders/ops-finance-forms',
  },
  // Higgsfield Generations
  {
    id: 'ops-higgsfield',
    name: 'Higgsfield Generations',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-higgsfield',
  },
  // Hiring Files
  {
    id: 'ops-hiring',
    name: 'Hiring Files',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-hiring',
  },
  {
    id: 'ops-hiring-resumes',
    name: 'Candidate Resumes',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-hiring',
    driveLink: 'https://drive.google.com/drive/folders/ops-hiring-resumes',
  },
  {
    id: 'ops-hiring-archive',
    name: 'Archive',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-hiring-resumes',
    driveLink: 'https://drive.google.com/drive/folders/ops-hiring-archive',
  },
  // Klavio Files
  {
    id: 'ops-klavio',
    name: 'Klavio Files',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-klavio',
  },
  // Payroll Master Files
  {
    id: 'ops-payroll-master',
    name: 'Payroll Master Files',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-master',
  },
  {
    id: 'ops-payroll-cash-advances',
    name: 'Cash Advances',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-cash-advances',
  },
  {
    id: 'ops-payroll-forms',
    name: 'Forms and Payslip',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-forms',
  },
  {
    id: 'ops-payroll-forms-archive',
    name: 'Archive',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-forms',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-forms-archive',
  },
  {
    id: 'ops-payroll-cash-advance-trackers',
    name: 'Cash Advance Trackers',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-forms',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-cash-advance-trackers',
  },
  {
    id: 'ops-payroll-cash-advance-q1',
    name: 'Q1 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-cash-advance-trackers',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-cash-advance-q1',
  },
  {
    id: 'ops-payroll-payment-research',
    name: 'Payment Research',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-payment-research',
  },
  {
    id: 'ops-payroll-invoices',
    name: 'Payroll Invoices',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-invoices',
  },
  {
    id: 'ops-payroll-invoices-feb',
    name: 'FEBRUARY 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-invoices',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-invoices-feb',
  },
  {
    id: 'ops-payroll-invoices-jan',
    name: 'January 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-invoices',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-invoices-jan',
  },
  {
    id: 'ops-payroll-slips',
    name: 'PAYROLL SLIPS',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-slips',
  },
  {
    id: 'ops-payroll-slips-feb',
    name: 'FEBRUARY',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-slips',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-slips-feb',
  },
  {
    id: 'ops-payroll-slips-jan',
    name: 'JANUARY',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-slips',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-slips-jan',
  },
  {
    id: 'ops-payroll-sops',
    name: 'Payroll SOPs',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-sops',
  },
  {
    id: 'ops-payroll-trackers',
    name: 'Trackers',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-payroll-master',
    driveLink: 'https://drive.google.com/drive/folders/ops-payroll-trackers',
  },
  // Peter Files
  {
    id: 'ops-peter',
    name: 'Peter Files',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-peter',
  },
  // Petty Cash
  {
    id: 'ops-petty-cash',
    name: 'Petty Cash',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-petty-cash',
  },
  // Procurement
  {
    id: 'ops-procurement',
    name: 'Procurement',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-procurement',
  },
  {
    id: 'ops-procurement-formulations',
    name: 'Formulations',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-procurement',
    driveLink: 'https://drive.google.com/drive/folders/ops-procurement-formulations',
  },
  {
    id: 'ops-procurement-requests',
    name: 'PROCUREMENT REQUESTS',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-procurement',
    driveLink: 'https://drive.google.com/drive/folders/ops-procurement-requests',
  },
  {
    id: 'ops-procurement-research',
    name: 'Procurement Research',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-procurement',
    driveLink: 'https://drive.google.com/drive/folders/ops-procurement-research',
  },
  // Progress Reports
  {
    id: 'ops-progress-reports',
    name: 'Progress Reports',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-reports',
  },
  {
    id: 'ops-progress-q1',
    name: 'Q1 Progress Reports',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-reports',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-q1',
  },
  {
    id: 'ops-progress-3d',
    name: '3D Modelling Department',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-q1',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-3d',
  },
  {
    id: 'ops-progress-3d-jan',
    name: 'January 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-3d',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-3d-jan',
  },
  {
    id: 'ops-progress-operations',
    name: 'Operations',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-q1',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-operations',
  },
  {
    id: 'ops-progress-operations-feb',
    name: 'February 2026',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-operations-feb',
  },
  {
    id: 'ops-progress-operations-daryl',
    name: 'Daryl Dave Caña',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-operations-feb',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-operations-daryl',
  },
  {
    id: 'ops-progress-webdev',
    name: 'Web Dev',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-progress-q1',
    driveLink: 'https://drive.google.com/drive/folders/ops-progress-webdev',
  },
  // RnD
  {
    id: 'ops-rnd',
    name: 'RnD',
    type: 'folder',
    department: 'Operations',
    parentId: 'root-operations',
    driveLink: 'https://drive.google.com/drive/folders/ops-rnd',
  },
  {
    id: 'ops-rnd-general',
    name: 'General Research',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-rnd',
    driveLink: 'https://drive.google.com/drive/folders/ops-rnd-general',
  },
  {
    id: 'ops-rnd-ppt',
    name: 'PPT Presentations',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-rnd',
    driveLink: 'https://drive.google.com/drive/folders/ops-rnd-ppt',
  },
  {
    id: 'ops-rnd-yl',
    name: 'YL RnD Files',
    type: 'folder',
    department: 'Operations',
    parentId: 'ops-rnd',
    driveLink: 'https://drive.google.com/drive/folders/ops-rnd-yl',
  },

  // ===== FREYA LUX DIRECTORY =====
  {
    id: 'root-freya-lux',
    name: 'FREYA LUX DIRECTORY',
    type: 'folder',
    department: 'Creatives',
    parentId: null,
    driveLink: 'https://drive.google.com/drive/folders/freya-lux-root',
  },
  // Candle Jars
  {
    id: 'freya-candle-jars',
    name: 'Candle Jars',
    type: 'folder',
    department: 'Creatives',
    parentId: 'root-freya-lux',
    driveLink: 'https://drive.google.com/drive/folders/freya-candle-jars',
  },
  {
    id: 'freya-cmj-2601-01',
    name: 'CMJ-2601-01 Petal Hex',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-01',
  },
  {
    id: 'freya-cmj-2601-01-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-01',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-01-stl',
  },
  {
    id: 'freya-cmj-2601-02',
    name: 'CMJ-2601-02',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-02',
  },
  {
    id: 'freya-cmj-2601-02-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-02',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-02-stl',
  },
  {
    id: 'freya-cmj-2601-03',
    name: 'CMJ-2601-03',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-03',
  },
  {
    id: 'freya-cmj-2601-03-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-03',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-03-stl',
  },
  {
    id: 'freya-cmj-2601-04',
    name: 'CMJ-2601-04',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04',
  },
  {
    id: 'freya-cmj-2601-04-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-04',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04-stl',
  },
  {
    id: 'freya-cmj-2601-04-v1',
    name: 'v1 First Version',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-04-stl',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04-v1',
  },
  {
    id: 'freya-cmj-2601-04-v2',
    name: 'v2 Rimmed Version',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-04-stl',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04-v2',
  },
  {
    id: 'freya-cmj-2601-04-v3',
    name: 'v3 Higher Fade Version',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-04-stl',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04-v3',
  },
  {
    id: 'freya-cmj-2601-04-v4',
    name: 'v4 Candle Version',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2601-04-stl',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2601-04-v4',
  },
  {
    id: 'freya-cmj-2602-01',
    name: 'CMJ-2602-01 Mandala Sands 1',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-01',
  },
  {
    id: 'freya-cmj-2602-01-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2602-01',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-01-stl',
  },
  {
    id: 'freya-cmj-2602-02',
    name: 'CMJ-2602-02 Mandala Sands 2',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-02',
  },
  {
    id: 'freya-cmj-2602-02-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2602-02',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-02-stl',
  },
  {
    id: 'freya-cmj-2602-03',
    name: 'CMJ-2602-03 Mandala Sands 3',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-03',
  },
  {
    id: 'freya-cmj-2602-03-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2602-03',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-03-stl',
  },
  {
    id: 'freya-cmj-2602-04',
    name: 'CMJ-2602-04 Mandala Sands 4',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-04',
  },
  {
    id: 'freya-cmj-2602-04-stl',
    name: 'STL Outputs',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-cmj-2602-04',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2602-04-stl',
  },
  {
    id: 'freya-cmj-2604-01',
    name: 'CMJ-2604-01',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-cmj-2604-01',
  },
  // Size Variations
  {
    id: 'freya-size-variations',
    name: 'Size Variations',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-candle-jars',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-variations',
  },
  {
    id: 'freya-size-16oz',
    name: '16oz',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-variations',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-16oz',
  },
  {
    id: 'freya-size-16oz-10mm',
    name: '10mm Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-16oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-16oz-10mm',
  },
  {
    id: 'freya-size-16oz-12mm',
    name: '12mm Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-16oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-16oz-12mm',
  },
  {
    id: 'freya-size-22oz',
    name: '22oz',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-variations',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-22oz',
  },
  {
    id: 'freya-size-22oz-12mm',
    name: '12mm Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-22oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-22oz-12mm',
  },
  {
    id: 'freya-size-22oz-14mm',
    name: '14mm Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-22oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-22oz-14mm',
  },
  {
    id: 'freya-size-6oz',
    name: '6oz',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-variations',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-6oz',
  },
  {
    id: 'freya-size-6oz-10mm',
    name: '10mm Wall Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-6oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-6oz-10mm',
  },
  {
    id: 'freya-size-6oz-8mm',
    name: '8mm Wall Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-6oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-6oz-8mm',
  },
  {
    id: 'freya-size-9oz',
    name: '9oz',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-variations',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-9oz',
  },
  {
    id: 'freya-size-9oz-10mm',
    name: '10mm Wall Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-9oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-9oz-10mm',
  },
  {
    id: 'freya-size-9oz-8mm',
    name: '8mm Wall Thickness',
    type: 'folder',
    department: 'Creatives',
    parentId: 'freya-size-9oz',
    driveLink: 'https://drive.google.com/drive/folders/freya-size-9oz-8mm',
  },
  // Slip Mold Testing
  {
    id: 'freya-slip-mold',
    name: 'Slip Mold Testing',
    type: 'folder',
    department: 'Creatives',
    parentId: 'root-freya-lux',
    driveLink: 'https://drive.google.com/drive/folders/freya-slip-mold',
  },
];

/**
 * NOTE FOR BACKEND DEVELOPER:
 * 
 * When implementing the backend API endpoints (see guide at bottom of file),
 * REMOVE the entire MOCK_DIRECTORIES array above and update the getAllFolders()
 * function to fetch data from the backend instead:
 * 
 * Example:
 * export async function getAllFolders(): Promise<FileDirectory[]> {
 *   const response = await fetch('/api/file-directory');
 *   const folders = await response.json();
 *   return folders;
 * }
 * 
 * This mock data serves as a comprehensive example of the folder structure
 * for the OPERATIONS DIRECTORY and FREYA LUX DIRECTORY.
 */

// ========== CUSTOM FOLDERS (User-Added via Frontend) ==========

const STORAGE_KEY = 'customDirectories';

export function getCustomFolders(): FileDirectory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom folders:', error);
    return [];
  }
}

export function saveCustomFolder(folder: Omit<FileDirectory, 'id'>): FileDirectory {
  const newFolder: FileDirectory = {
    ...folder,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  const existing = getCustomFolders();
  existing.push(newFolder);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving custom folder:', error);
  }

  return newFolder;
}

export function deleteCustomFolder(id: string): void {
  const folders = getCustomFolders().filter(f => f.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error('Error deleting custom folder:', error);
  }
}

export function getAllFolders(): FileDirectory[] {
  return [...MOCK_DIRECTORIES, ...getCustomFolders()];
}

// ========== NAVIGATION HELPERS ==========

export function getRootFolders(): FileDirectory[] {
  return getAllFolders().filter(f => f.parentId === null);
}

export function getChildren(parentId: string): FileDirectory[] {
  return getAllFolders().filter(f => f.parentId === parentId);
}

export function getChildCount(folderId: string): number {
  return getAllFolders().filter(f => f.parentId === folderId).length;
}

export function getBreadcrumbs(folderId: string | null): FileDirectory[] {
  if (!folderId) return [];

  const path: FileDirectory[] = [];
  const allFolders = getAllFolders();
  let current = allFolders.find(f => f.id === folderId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? allFolders.find(f => f.id === current!.parentId) : undefined;
  }

  return path;
}

export function getFolderById(id: string): FileDirectory | undefined {
  return getAllFolders().find(f => f.id === id);
}

// ========== FILTERING & SEARCH ==========

export function filterFolders(
  folders: FileDirectory[],
  searchQuery?: string,
  departmentFilter?: string
): FileDirectory[] {
  return folders.filter(f => {
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !departmentFilter || f.department === departmentFilter;
    return matchesSearch && matchesDept;
  });
}

export function sortFolders(
  folders: FileDirectory[],
  sortBy: 'name' | 'department' | 'date'
): FileDirectory[] {
  const sorted = [...folders];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'department':
      return sorted.sort((a, b) => a.department.localeCompare(b.department));
    case 'date':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
    default:
      return sorted;
  }
}

// ========== VALIDATION ==========

export function isValidDriveLink(url: string): boolean {
  const patterns = [
    /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/,
    /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/[a-zA-Z0-9_-]+/,
  ];
  return patterns.some(pattern => pattern.test(url));
}

export function extractDriveFolderId(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export interface DriveSubfolder {
  id: string;
  name: string;
  driveLink: string;
  mimeType: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  driveLink: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Fetches immediate subfolders-only (used by AddFolderModal preview).
 */
export async function fetchDriveSubfolders(folderId: string): Promise<DriveSubfolder[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY is not set — subfolder detection unavailable.');
    return [];
  }

  try {
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const fields = encodeURIComponent('files(id,name,mimeType)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=50`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Drive API error:', err);
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      driveLink: `https://drive.google.com/drive/folders/${f.id}`,
    }));
  } catch (err) {
    console.error('Failed to fetch Drive subfolders:', err);
    return [];
  }
}

/**
 * Fetches ALL contents (files + folders) of a Drive folder for the inline Drive browser.
 * Requires NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY and the folder to be publicly shared.
 */
export async function fetchDriveFiles(folderId: string): Promise<DriveFile[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  if (!apiKey) return [];

  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent(
      'files(id,name,mimeType,iconLink,thumbnailLink,size,modifiedTime,webViewLink)'
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=100&orderBy=folder,name`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Drive API (files) error:', err);
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        isFolder,
        driveLink: isFolder
          ? `https://drive.google.com/drive/folders/${f.id}`
          : (f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`),
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        size: f.size,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      };
    });
  } catch (err) {
    console.error('Failed to fetch Drive files:', err);
    return [];
  }
}

// ========== VIEW PREFERENCE ==========

const VIEW_STORAGE_KEY = 'fileDirectoryView';

export function getViewPreference(): 'grid' | 'list' {
  if (typeof window === 'undefined') return 'grid';
  try {
    return (localStorage.getItem(VIEW_STORAGE_KEY) as 'grid' | 'list') || 'grid';
  } catch {
    return 'grid';
  }
}

export function saveViewPreference(view: 'grid' | 'list'): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// ========== CONSTANTS ==========

// Re-export DEPARTMENTS from centralized source
export { DEPARTMENTS } from './departments';

// Department color mappings (supports both mock data departments and real departments)
export const DEPARTMENT_COLORS: Record<string, string> = {
  // Mock data departments (for demo folders)
  'Operations': 'var(--dept-operations)',
  'Creatives': 'var(--dept-creatives)',
  'Finance': 'var(--dept-finance)',
  'Engineering': 'var(--dept-engineering)',

  // Real organization departments
  'Website Developers': '#3b82f6', // Blue
  'Operations Manager': '#10b981', // Green
  'Payroll / Finance': '#f59e0b', // Amber
  'Digital Marketing Lead / Marketing VA': '#a855f7', // Purple
  'Analytics / Data VA': '#06b6d4', // Cyan
  'Automation / Tech VA': '#ec4899', // Pink
};

export const DEPARTMENT_COLORS_BG: Record<string, string> = {
  // Mock data departments (for demo folders)
  'Operations': 'var(--dept-operations-bg)',
  'Creatives': 'var(--dept-creatives-bg)',
  'Finance': 'var(--dept-finance-bg)',
  'Engineering': 'var(--dept-engineering-bg)',

  // Real organization departments
  'Website Developers': 'rgba(59, 130, 246, 0.1)', // Blue
  'Operations Manager': 'rgba(16, 185, 129, 0.1)', // Green
  'Payroll / Finance': 'rgba(245, 158, 11, 0.1)', // Amber
  'Digital Marketing Lead / Marketing VA': 'rgba(168, 85, 247, 0.1)', // Purple
  'Analytics / Data VA': 'rgba(6, 182, 212, 0.1)', // Cyan
  'Automation / Tech VA': 'rgba(236, 72, 153, 0.1)', // Pink
};

// Preset folder colors for custom folders
export const PRESET_FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { name: 'Purple', value: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  { name: 'Green', value: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { name: 'Amber', value: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { name: 'Red', value: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { name: 'Pink', value: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  { name: 'Cyan', value: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
  { name: 'Orange', value: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { name: 'Indigo', value: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  { name: 'Emerald', value: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  { name: 'Rose', value: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
  { name: 'Violet', value: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
];

// ========== BACKEND INTEGRATION GUIDE ==========

/**
 * BACKEND INTEGRATION NOTES (for backend partner):
 * 
 * Replace these functions with API calls when backend is ready:
 * 
 * 1. GET /api/file-directory?parentId={id}
 *    - Returns: FileDirectory[]
 *    - Replace: getAllFolders(), getRootFolders(), getChildren()
 * 
 * 2. POST /api/file-directory/import
 *    - Body: { driveLink: string, department?: string, parentId?: string }
 *    - Returns: FileDirectory (with auto-fetched name from Drive API)
 *    - Replace: saveCustomFolder()
 * 
 *    Backend should:
 *    - Use Google Drive API to fetch folder metadata (name, parents)
 *    - Auto-detect parentId by matching parent drive folder ID in database
 *    - This eliminates the need for users to manually select parent folders!
 *    - Store in Prisma with FileDirectory model
 *    
 *    Example auto-parent detection logic:
 *    ```typescript
 *    const driveMetadata = await drive.files.get({ fileId, fields: 'name, parents' });
 *    let parentId = null;
 *    if (driveMetadata.parents?.[0]) {
 *      const parent = await prisma.fileDirectory.findFirst({
 *        where: { driveLink: { contains: driveMetadata.parents[0] } }
 *      });
 *      if (parent) parentId = parent.id; // Auto-detected!
 *    }
 *    ```
 * 
 * 3. DELETE /api/file-directory/:id
 *    - Replace: deleteCustomFolder()
 * 
 * 4. POST /api/file-directory/validate-link
 *    - Body: { driveLink: string }
 *    - Returns: { valid: boolean, metadata: { name, parents } }
 *    - Enhance: isValidDriveLink() to call this endpoint
 * 
 * Example backend API client:
 * 
 * export async function fetchDirectories(parentId?: string): Promise<FileDirectory[]> {
 *   const res = await fetch(`/api/file-directory${parentId ? `?parent=${parentId}` : ''}`);
 *   if (!res.ok) throw new Error('Failed to fetch directories');
 *   return res.json();
 * }
 * 
 * export async function createFolder(data: Partial<FileDirectory>): Promise<FileDirectory> {
 *   const res = await fetch('/api/file-directory', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(data),
 *   });
 *   if (!res.ok) throw new Error('Failed to create folder');
 *   return res.json();
 * }
 */
