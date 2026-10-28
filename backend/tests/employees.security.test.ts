import assert from 'node:assert/strict'
import {
  employeePayVisibility,
  hasEmployeeManagementAccess,
  isClientOnlyAccount,
  isInternalEmployeeAccount,
  serializeDeployedEmployee,
  serializeEmployeeApplication,
  serializeEmployeesForManagement,
} from '../src/employees/employees.security'

assert.equal(hasEmployeeManagementAccess([{ role: 'Operations Manager' }]), true)
assert.equal(hasEmployeeManagementAccess([{ role: 'Project Manager' }]), true)
assert.equal(hasEmployeeManagementAccess([{ role: 'Owner / Founder' }]), true)
assert.equal(hasEmployeeManagementAccess([{ role: 'Bookkeeping' }]), false)
assert.equal(hasEmployeeManagementAccess([{ role: 'employee' }]), false)
assert.equal(hasEmployeeManagementAccess([], true), true)
assert.equal(isClientOnlyAccount({ roles: [{ role: 'client' }] }), true)
assert.equal(isClientOnlyAccount({ roles: [{ role: 'client_admin' }] }), true)
assert.equal(isClientOnlyAccount({ roles: [{ role: 'client_member' }], clientMemberships: [{ status: 'active' }] }), true)
assert.equal(isInternalEmployeeAccount({ roles: [{ role: 'client_owner' }] }), false)
assert.equal(isInternalEmployeeAccount({ roles: [{ role: 'client_member' }, { role: 'Operations Manager' }] }), true)
assert.equal(isInternalEmployeeAccount({ roles: [], clientMemberships: [{ status: 'active' }] }), false)
assert.equal(isInternalEmployeeAccount({ roles: [], clientMemberships: [{ status: 'inactive' }] }), false)
assert.equal(isInternalEmployeeAccount({ roles: [], clientMemberships: [] }), true)

const application = serializeEmployeeApplication({
  id: 'user-1',
  email: 'new@example.com',
  name: 'New Hire',
  avatar: null,
  password: 'hashed',
  passwordResetToken: 'secret',
  employeeProfile: {
    jobTitle: 'Developer',
    baseSalary: 90000,
    bankAccount: '123',
  },
})

assert.deepEqual(application, {
  id: 'user-1',
  email: 'new@example.com',
  name: 'New Hire',
  avatar: null,
})

const deployedEmployee = {
  id: 'user-2',
  email: 'employee@example.com',
  name: 'Employee',
  avatar: 'E',
  status: 'verified',
  phone: '555',
  address: 'Street',
  city: 'City',
  citizenship: 'PH',
  birthday: new Date('2000-01-02T00:00:00.000Z'),
  password: 'hashed',
  employeeProfile: {
    jobTitle: 'Designer',
    employmentType: 'Full Time',
    baseSalary: 75000,
    payrollScheme: 'flat_160_hours',
    maxBillableHoursPerDay: 7.5,
    bankAccount: '456',
    taxId: 'TIN',
    taxRule: 'withholding_5',
  },
  hoursThisWeek: 8,
  performance: 0,
}

// Pay fields go to payroll roles and configured admins only (review fix 2026-10-28).
const payrollView = employeePayVisibility([{ role: 'Bookkeeping' }])
const managerView = employeePayVisibility([{ role: 'Project Manager' }])
assert.deepEqual(payrollView, { includePay: true })
assert.deepEqual(managerView, { includePay: false }, 'a manager without a payroll role gets no pay fields')
assert.deepEqual(employeePayVisibility([{ role: 'Operations Manager' }]), { includePay: true }, 'operations managers are payroll roles')
assert.deepEqual(employeePayVisibility([], true), { includePay: true }, 'configured admin emails')

const deployed = serializeDeployedEmployee(deployedEmployee, payrollView)

assert.equal('password' in deployed, false)
assert.equal('employeeProfile' in deployed, false)
assert.deepEqual(deployed, {
  id: 'user-2',
  email: 'employee@example.com',
  name: 'Employee',
  avatar: 'E',
  status: 'verified',
  phone: '555',
  address: 'Street',
  city: 'City',
  citizenship: 'PH',
  birthday: '2000-01-02T00:00:00.000Z',
  appliedDate: null,
  role: 'Designer',
  department: 'Operations',
  salary: 75000,
  payrollScheme: 'flat_160_hours',
  maxBillableHoursPerDay: 7.5,
  payBasis: 'hourly_from_monthly',
  paymentFrequency: null,
  employmentType: 'Full Time',
  currency: null,
  taxRule: 'withholding_5',
  hoursThisWeek: 8,
  performance: 0,
})

// A manager without a payroll role: the same row without salary, scheme, pay basis, tax or cap.
const managerRow = serializeDeployedEmployee(deployedEmployee, managerView)
for (const field of ['salary', 'payrollScheme', 'maxBillableHoursPerDay', 'payBasis', 'paymentFrequency', 'currency', 'taxRule']) {
  assert.equal(field in managerRow, false, `${field} is left out for a manager without a payroll role`)
}
assert.equal(managerRow.employmentType, 'Full Time', 'the category is a label, not pay')
assert.equal(managerRow.role, 'Designer')
assert.equal('salary' in serializeDeployedEmployee(deployedEmployee), false, 'without a visibility no pay fields leave')
assert.deepEqual(
  serializeEmployeesForManagement([deployedEmployee], managerView).map((row) => 'salary' in row),
  [false],
)
assert.deepEqual(
  serializeEmployeesForManagement([deployedEmployee], payrollView).map((row) => (row as { salary?: number }).salary),
  [75000],
)

// No payroll profile yet: no scheme key (the default scheme applies once one is created).
const payOf = (employee: Parameters<typeof serializeDeployedEmployee>[0]) =>
  serializeDeployedEmployee(employee, payrollView) as { payrollScheme?: string | null; taxRule?: string | null }
assert.equal(payOf({ id: 'user-3', employeeProfile: null }).payrollScheme, null)
// The withholding tax choice (2026-10-28): null follows the workspace default.
assert.equal(payOf({ id: 'user-4', employeeProfile: { taxRule: 'none' } }).taxRule, 'none')

console.log('employees.security tests passed')
