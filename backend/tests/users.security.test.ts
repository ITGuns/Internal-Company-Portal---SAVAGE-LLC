import assert from 'node:assert/strict'
import { sanitizeUserForDirectory } from '../src/users/users.security'

const sanitized = sanitizeUserForDirectory({
  id: 'user-1',
  email: 'employee@example.com',
  name: 'Employee',
  phone: '555',
  address: 'Street',
  city: 'City',
  citizenship: 'PH',
  password: 'hashed',
  passwordResetToken: 'secret',
  passwordResetExpiry: new Date(),
  employeeProfile: {
    jobTitle: 'Developer',
    employmentType: 'Full Time',
    baseSalary: 80000,
    currency: 'PHP',
    bankAccount: '123456',
    taxId: 'TIN-123',
    paymentFrequency: 'monthly',
  },
})

assert.equal('password' in sanitized, false)
assert.equal('passwordResetToken' in sanitized, false)
assert.equal('passwordResetExpiry' in sanitized, false)
assert.equal('phone' in sanitized, false)
assert.equal('address' in sanitized, false)
assert.equal('city' in sanitized, false)
assert.equal('citizenship' in sanitized, false)
assert.deepEqual(sanitized.employeeProfile, {
  jobTitle: 'Developer',
  employmentType: 'Full Time',
})

console.log('users.security tests passed')
