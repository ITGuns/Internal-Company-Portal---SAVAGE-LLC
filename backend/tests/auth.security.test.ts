import assert from 'node:assert/strict'
import {
  authPasswordResetUserSelect,
  authTokenUserSelect,
  authUserSelect,
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

for (const field of ['avatar', 'phone', 'address', 'city', 'citizenship', 'birthday', 'managerId']) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(authUserSelect, field),
    false,
    `authUserSelect should not require optional profile column ${field}`,
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(authTokenUserSelect, field),
    false,
    `authTokenUserSelect should not require optional profile column ${field}`,
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(authPasswordResetUserSelect, field),
    false,
    `authPasswordResetUserSelect should not require optional profile column ${field}`,
  )
}

console.log('auth.security tests passed')
