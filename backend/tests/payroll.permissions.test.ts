import assert from 'node:assert/strict'
import {
  canAccessPayrollTarget,
  filterPayrollProfileUpdate,
  getProtectedPayrollProfileFields,
  hasPayrollManagementAccess,
  normalizePayrollRoleName,
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

console.log('payroll.permissions tests passed')
