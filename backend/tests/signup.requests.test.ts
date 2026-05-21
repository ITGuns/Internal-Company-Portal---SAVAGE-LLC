import assert from 'node:assert/strict'
import {
  buildPendingSignupProfile,
  canLoginApprovedUser,
  getApprovedRoleAssignment,
} from '../src/auth/signup.requests'
import {
  getDefaultSignupRoles,
  hasConfiguredSignupRolesForDepartment,
  isDefaultSignupRoleAllowed,
} from '../src/auth/signup-role-options'

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

assert.deepEqual(
  getDefaultSignupRoles('Website Developers'),
  [
    'Lead Frontend Developer',
    'Senior Backend Developer',
    'Full Stack Developer',
    'UI/UX Designer',
    'App Developer',
    'Web Development Assistant',
  ],
)
assert.equal(isDefaultSignupRoleAllowed('Website Developers', 'Full Stack Developer'), true)
assert.equal(isDefaultSignupRoleAllowed('Website Developers', 'Operations Manager'), false)
assert.equal(hasConfiguredSignupRolesForDepartment([{ departmentId: null }], 'dept-web'), false)
assert.equal(hasConfiguredSignupRolesForDepartment([{ departmentId: 'dept-web' }], 'dept-web'), true)

console.log('signup.requests tests passed')
