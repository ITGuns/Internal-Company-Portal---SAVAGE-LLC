import assert from 'node:assert/strict'
import {
  canIssueAuthTokens,
  serializeAuthUser,
} from '../src/auth/auth.security'

const serialized = serializeAuthUser({
  id: 'user-1',
  email: 'employee@example.com',
  name: 'Employee',
  avatar: null,
  password: 'hashed',
  passwordResetToken: 'reset-secret',
  passwordResetExpiry: new Date(),
  isApproved: true,
  status: 'verified',
  roles: [{ role: 'manager' }, { role: 'employee' }],
})

assert.deepEqual(serialized, {
  id: 'user-1',
  email: 'employee@example.com',
  name: 'Employee',
  avatar: null,
  phone: null,
  address: null,
  city: null,
  citizenship: null,
  birthday: null,
  isApproved: true,
  status: 'verified',
  role: 'manager',
  roles: ['manager', 'employee'],
})

assert.equal(canIssueAuthTokens({ isApproved: true, status: 'verified' }), true)
assert.equal(canIssueAuthTokens({ isApproved: false, status: 'verified' }), false)
assert.equal(canIssueAuthTokens({ isApproved: true, status: 'pending' }), false)

console.log('auth.security tests passed')
