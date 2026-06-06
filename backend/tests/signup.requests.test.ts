import assert from 'node:assert/strict'
import {
  buildPendingSignupProfile,
  canLoginApprovedUser,
  getApprovedRoleAssignment,
  requireApprovedRoleAssignment,
} from '../src/auth/signup.requests'
import {
  buildDefaultSignupRoleId,
  findMergedSignupRoleById,
  getDefaultSignupRoles,
  hasConfiguredSignupRolesForDepartment,
  isDefaultSignupRoleAllowed,
  mergeSignupRolesForDepartment,
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
assert.throws(
  () => requireApprovedRoleAssignment({ requestedRole: null, requestedDepartmentId: null }),
  /missing a requested role or department/i,
)
assert.deepEqual(
  requireApprovedRoleAssignment({ requestedRole: 'Designer', requestedDepartmentId: 'dept-design' }),
  {
    role: 'Designer',
    departmentId: 'dept-design',
  },
)

assert.equal(canLoginApprovedUser({ status: 'pending', isApproved: false }), false)
assert.equal(canLoginApprovedUser({ status: 'active', isApproved: false }), false)
assert.equal(canLoginApprovedUser({ status: 'active', isApproved: true }), true)

assert.deepEqual(
  getDefaultSignupRoles('Website Developers'),
  [
    'Frontend Developer',
    'Backend / Technical Developer',
  ],
)
assert.deepEqual(
  getDefaultSignupRoles('Operations'),
  [
    'Operations Manager',
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA',
  ],
)
assert.deepEqual(
  getDefaultSignupRoles('Digital Marketing'),
  [
    'Digital Marketing Lead / Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA',
  ],
)
assert.deepEqual(getDefaultSignupRoles('Analytics / Data'), ['Analytics / Data VA'])
assert.deepEqual(getDefaultSignupRoles('Automation / Tech'), ['Automation / Tech VA'])
assert.deepEqual(getDefaultSignupRoles('Project Management'), ['Project Manager'])
assert.deepEqual(
  getDefaultSignupRoles('Payroll / Finance'),
  ['Bookkeeping', 'Contractor & Salary Payments'],
)
assert.equal(isDefaultSignupRoleAllowed('Website Developers', 'Frontend Developer'), true)
assert.equal(isDefaultSignupRoleAllowed('Website Developers', 'Operations Manager'), false)
assert.equal(hasConfiguredSignupRolesForDepartment([{ departmentId: null }], 'dept-web'), false)
assert.equal(hasConfiguredSignupRolesForDepartment([{ departmentId: 'dept-web' }], 'dept-web'), true)

const mergedWebsiteRoles = mergeSignupRolesForDepartment({
  id: 'dept-web',
  name: 'Website Developers',
  availableRoles: [
    {
      id: 'role-existing',
      name: 'Frontend Developer',
      departmentId: 'dept-web',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
  ],
})

assert.deepEqual(
  mergedWebsiteRoles.map((role) => role.name),
  ['Frontend Developer', 'Backend / Technical Developer'],
)
assert.equal(
  mergedWebsiteRoles[1].id,
  buildDefaultSignupRoleId('dept-web', 'Backend / Technical Developer'),
)
assert.deepEqual(
  findMergedSignupRoleById(
    [{
      id: 'dept-web',
      name: 'Website Developers',
      availableRoles: [],
    }],
    buildDefaultSignupRoleId('dept-web', 'Backend / Technical Developer'),
  )?.name,
  'Backend / Technical Developer',
)

console.log('signup.requests tests passed')
