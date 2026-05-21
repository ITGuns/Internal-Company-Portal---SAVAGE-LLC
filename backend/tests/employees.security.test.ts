import assert from 'node:assert/strict'
import {
  hasEmployeeManagementAccess,
  serializeDeployedEmployee,
  serializeEmployeeApplication,
} from '../src/employees/employees.security'

assert.equal(hasEmployeeManagementAccess([{ role: 'Operations Manager' }]), true)
assert.equal(hasEmployeeManagementAccess([{ role: 'employee' }]), false)
assert.equal(hasEmployeeManagementAccess([], true), true)

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
  hoursThisWeek: 8,
  performance: 0,
})

console.log('employees.security tests passed')
