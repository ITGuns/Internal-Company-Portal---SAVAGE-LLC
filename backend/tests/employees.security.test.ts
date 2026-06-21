import assert from 'node:assert/strict'
import {
  hasEmployeeManagementAccess,
  isClientOnlyAccount,
  isInternalEmployeeAccount,
  serializeDeployedEmployee,
  serializeEmployeeApplication,
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

const deployed = serializeDeployedEmployee({
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
  },
  hoursThisWeek: 8,
  performance: 0,
})

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
  hoursThisWeek: 8,
  performance: 0,
})

console.log('employees.security tests passed')
