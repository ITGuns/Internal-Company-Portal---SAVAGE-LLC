import assert from 'node:assert/strict'
import { PayrollController } from '../src/payroll/payroll.controller'
import {
  canAccessPayrollTarget,
  canReviewTimeRequests,
  canSignDisbursement,
  filterPayrollProfileUpdate,
  getProtectedPayrollProfileFields,
  getRefusedOwnPayFields,
  hasPayrollManagementAccess,
  isOwnHoursOverride,
  normalizePayrollRoleName,
  PAYROLL_MANAGEMENT_ROUTE_ROLES,
  TIME_REVIEW_ROUTE_ROLES,
} from '../src/payroll/payroll.permissions'

assert.equal(normalizePayrollRoleName('Operations Manager'), 'operations_manager')
assert.equal(normalizePayrollRoleName(' operations_manager '), 'operations_manager')
assert.equal(normalizePayrollRoleName('Contractor & Salary Payments'), 'contractor_salary_payments')

assert.equal(hasPayrollManagementAccess([{ role: 'admin' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Owner / Founder' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Operations Manager' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Bookkeeper' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Bookkeeping' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Contractor & Salary Payments' }]), true)
assert.equal(hasPayrollManagementAccess([{ role: 'Project Manager' }]), false)
assert.equal(hasPayrollManagementAccess([{ role: 'Website Developer' }]), false)
assert.equal(hasPayrollManagementAccess([], true), true)

const payrollRouter = new PayrollController().router() as any
for (const method of ['post', 'patch', 'delete']) {
  const routePath = method === 'post' ? '/events' : '/events/:id'
  const eventMutationRoute = payrollRouter.stack.find((layer: any) =>
    layer.route?.path === routePath &&
    layer.route?.methods?.[method],
  )
  assert.ok(eventMutationRoute, `${method.toUpperCase()} ${routePath} route is registered`)
  assert.ok(
    eventMutationRoute.route.stack.length >= 3,
    `${method.toUpperCase()} ${routePath} requires auth and payroll-management authorization`,
  )
}

assert.equal(
  canAccessPayrollTarget({ requesterId: 'user-1', isPrivileged: false }, 'user-1'),
  true,
)
assert.equal(
  canAccessPayrollTarget({ requesterId: 'user-1', isPrivileged: false }, 'user-2'),
  false,
)
assert.equal(
  canAccessPayrollTarget({ requesterId: 'manager-1', isPrivileged: true }, 'user-2'),
  true,
)

assert.deepEqual(
  getProtectedPayrollProfileFields({
    baseSalary: 50000,
    bankAccount: '123',
    taxId: 'TIN',
    payrollScheme: 'flat_160_hours',
    maxBillableHoursPerDay: 8,
    unknown: 'ignored',
  }),
  ['baseSalary', 'bankAccount', 'taxId', 'payrollScheme', 'maxBillableHoursPerDay'],
)

assert.deepEqual(
  filterPayrollProfileUpdate(
    {
      baseSalary: 50000,
      currency: 'PHP',
      payrollScheme: 'flat_160_hours',
      maxBillableHoursPerDay: 7.5,
      bankAccount: '123',
      taxId: 'TIN',
      requestedRole: 'admin',
      unknown: 'ignored',
    },
    { isPrivileged: true },
  ),
  {
    data: {
      baseSalary: 50000,
      currency: 'PHP',
      payrollScheme: 'flat_160_hours',
      maxBillableHoursPerDay: 7.5,
      bankAccount: '123',
      taxId: 'TIN',
    },
    rejectedFields: [],
  },
)

assert.deepEqual(
  filterPayrollProfileUpdate(
    {
      baseSalary: 50000,
      bankAccount: '123',
      taxId: 'TIN',
      payrollScheme: 'flat_20',
      maxBillableHoursPerDay: 6,
    },
    { isPrivileged: false },
  ),
  {
    data: {},
    rejectedFields: ['baseSalary', 'bankAccount', 'taxId', 'payrollScheme', 'maxBillableHoursPerDay'],
  },
)

// Route-level role lists derive from org-access-policy, so they match the helpers exactly.
for (const role of PAYROLL_MANAGEMENT_ROUTE_ROLES) {
  assert.equal(hasPayrollManagementAccess([{ role }]), true, `${role} is payroll management`)
}
for (const role of TIME_REVIEW_ROUTE_ROLES) {
  assert.equal(canReviewTimeRequests([{ role }]), true, `${role} reviews time`)
}
for (const role of ['bookkeeping', 'payroll_finance', 'operations_manager', 'owner_founder']) {
  assert.ok(PAYROLL_MANAGEMENT_ROUTE_ROLES.includes(role), `${role} passes payroll route guards`)
}
assert.ok(!PAYROLL_MANAGEMENT_ROUTE_ROLES.includes('project_manager'), 'plain managers are not payroll')
for (const role of ['project_manager', 'manager', 'chief_operations_officer', 'bookkeeping']) {
  assert.ok(TIME_REVIEW_ROUTE_ROLES.includes(role), `${role} passes time-review route guards`)
}
assert.equal(new Set(TIME_REVIEW_ROUTE_ROLES).size, TIME_REVIEW_ROUTE_ROLES.length, 'no duplicate roles')

// Disbursement Officer (2026-10-28): payroll-management access, and the only
// non-admin role that signs off payslips.
assert.equal(normalizePayrollRoleName('Disbursement Officer'), 'disbursement_officer')
assert.equal(hasPayrollManagementAccess([{ role: 'Disbursement Officer' }]), true)
assert.ok(PAYROLL_MANAGEMENT_ROUTE_ROLES.includes('disbursement_officer'), 'disbursement officers pass payroll route guards')
assert.equal(canSignDisbursement([{ role: 'Disbursement Officer' }]), true)
assert.equal(canSignDisbursement([{ role: 'admin' }]), true, 'full access signs')
assert.equal(canSignDisbursement([{ role: 'Owner / Founder' }]), true, 'full access signs')
assert.equal(canSignDisbursement([{ role: 'Frontend Developer' }], true), true, 'configured admin emails sign')
assert.equal(canSignDisbursement([{ role: 'Bookkeeping' }]), false, 'payroll managers without the role do not sign')
assert.equal(canSignDisbursement([{ role: 'Operations Manager' }]), false)
assert.equal(canSignDisbursement([{ role: 'Frontend Developer' }]), false)
assert.equal(canSignDisbursement([]), false)

// The tax choice is a protected profile field (payroll managers only).
assert.deepEqual(getProtectedPayrollProfileFields({ taxRule: 'none', jobTitle: 'Editor' }), ['taxRule', 'jobTitle'])
assert.deepEqual(filterPayrollProfileUpdate({ taxRule: null }, { isPrivileged: true }).data, { taxRule: null })

// Own pay setup and own hand-entered hours (review fix 2026-10-28): refused without
// full access; anyone else's profile and full access are unaffected.
const payrollSelf = { requesterId: 'books-1', isPrivileged: true, isFullAccess: false }
const ownerSelf = { requesterId: 'owner-1', isPrivileged: true, isFullAccess: true }
const allPayFields = { baseSalary: 1, hourlyRate: 1, payrollScheme: 'x', payBasis: 'x', taxRule: null, maxBillableHoursPerDay: 8, overtimeMultiplier: 2 }
assert.deepEqual(getRefusedOwnPayFields(payrollSelf, 'books-1', { ...allPayFields, bankAccount: '1', jobTitle: 'Clerk' }), Object.keys(allPayFields))
assert.deepEqual(getRefusedOwnPayFields(payrollSelf, 'books-1', { bankAccount: '1', taxId: 'TIN', jobTitle: 'Clerk' }), [])
assert.deepEqual(getRefusedOwnPayFields(payrollSelf, 'someone-else', allPayFields), [])
assert.deepEqual(getRefusedOwnPayFields(ownerSelf, 'owner-1', allPayFields), [])
assert.equal(isOwnHoursOverride(payrollSelf, 'books-1', { hoursWorked: 0 }), true, 'zero hours is still an override')
assert.equal(isOwnHoursOverride(payrollSelf, 'books-1', { hoursWorked: null, deductions: [] }), false)
assert.equal(isOwnHoursOverride(payrollSelf, 'books-1', {}), false)
assert.equal(isOwnHoursOverride(payrollSelf, 'someone-else', { hoursWorked: 80 }), false)
assert.equal(isOwnHoursOverride(ownerSelf, 'owner-1', { hoursWorked: 80 }), false)

for (const [method, routePath] of [
  ['post', '/payslips/:id/approve'],
  ['post', '/payslips/:id/revoke-approval'],
  ['post', '/periods/:periodId/approve-all'],
  ['get', '/periods/:periodId/approval-summary'],
  ['get', '/tax-rules'],
  ['post', '/tax-rules'],
  ['patch', '/tax-rules/:id'],
  ['delete', '/tax-rules/:id'],
]) {
  const layer = payrollRouter.stack.find((entry: any) => entry.route?.path === routePath && entry.route?.methods?.[method])
  assert.ok(layer, `${method.toUpperCase()} ${routePath} route is registered`)
  assert.ok(layer.route.stack.length >= 2, `${method.toUpperCase()} ${routePath} requires auth`)
}

// Creating a period (the current one included, since 2026-10-28) and the employee history:
// authentication, then the payroll-management role guard, then the handler.
for (const [method, routePath] of [
  ['post', '/periods'],
  ['post', '/periods/ensure'],
  ['get', '/reports/roster'],
  ['get', '/reports/roster.csv'],
]) {
  const layer = payrollRouter.stack.find((entry: any) => entry.route?.path === routePath && entry.route?.methods?.[method])
  assert.ok(layer, `${method.toUpperCase()} ${routePath} route is registered`)
  assert.ok(
    layer.route.stack.length >= 3,
    `${method.toUpperCase()} ${routePath} requires auth and payroll-management authorization`,
  )
}

console.log('payroll.permissions tests passed')
