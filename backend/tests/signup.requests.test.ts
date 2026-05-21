import assert from 'node:assert/strict'
import {
  buildPendingSignupProfile,
  canLoginApprovedUser,
  getApprovedRoleAssignment,
} from '../src/auth/signup.requests'

assert.deepEqual(
  buildPendingSignupProfile({ role: 'Web Developer', departmentId: 'dept-1' }),
  {
    jobTitle: 'Web Developer',
    requestedRole: 'Web Developer',
    requestedDepartmentId: 'dept-1',
  },
)

assert.deepEqual(
  getApprovedRoleAssignment({
    jobTitle: 'Web Developer',
    requestedRole: 'Web Developer',
    requestedDepartmentId: 'dept-1',
  }),
  {
    role: 'Web Developer',
    departmentId: 'dept-1',
  },
)

assert.equal(
  getApprovedRoleAssignment({
    jobTitle: 'Web Developer',
    requestedRole: null,
    requestedDepartmentId: null,
  }),
  null,
)

assert.equal(canLoginApprovedUser({ status: 'pending', isApproved: false }), false)
assert.equal(canLoginApprovedUser({ status: 'active', isApproved: false }), false)
assert.equal(canLoginApprovedUser({ status: 'active', isApproved: true }), true)

console.log('signup.requests tests passed')
