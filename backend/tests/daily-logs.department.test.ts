import assert from 'node:assert/strict'
import {
  canOverrideDailyLogDepartment,
  getPrimaryDailyLogDepartment,
  resolveDailyLogDepartment,
} from '../src/daily-logs/daily-logs.department'

const websiteDeveloperRole = {
  role: 'Frontend Developer',
  departmentId: 'dept-web',
  department: { name: 'Website Developers' },
}

assert.equal(getPrimaryDailyLogDepartment([websiteDeveloperRole]), 'Website Developers')

assert.equal(
  canOverrideDailyLogDepartment([{ role: 'Operations Manager', departmentId: 'dept-ops' }]),
  true,
)
assert.equal(
  canOverrideDailyLogDepartment([{ role: 'Project Manager', departmentId: 'dept-project' }]),
  true,
)
assert.equal(
  canOverrideDailyLogDepartment([{ role: 'Owner / Founder', departmentId: 'dept-owner' }]),
  true,
)
assert.equal(canOverrideDailyLogDepartment([websiteDeveloperRole]), false)

assert.deepEqual(
  resolveDailyLogDepartment({
    requestedDepartment: undefined,
    roles: [websiteDeveloperRole],
    isPrivilegedEmail: false,
  }),
  { ok: true, department: 'Website Developers' },
)

assert.deepEqual(
  resolveDailyLogDepartment({
    requestedDepartment: 'Operations',
    roles: [websiteDeveloperRole],
    isPrivilegedEmail: false,
  }),
  {
    ok: false,
    status: 403,
    error: 'Daily logs use your assigned department.',
  },
)

assert.deepEqual(
  resolveDailyLogDepartment({
    requestedDepartment: 'Operations',
    roles: [{ role: 'manager', departmentId: 'dept-web', department: { name: 'Website Developers' } }],
    isPrivilegedEmail: false,
  }),
  { ok: true, department: 'Operations' },
)

assert.deepEqual(
  resolveDailyLogDepartment({
    requestedDepartment: undefined,
    roles: [],
    isPrivilegedEmail: false,
  }),
  {
    ok: false,
    status: 400,
    error: 'Your account needs an assigned department before creating daily logs.',
  },
)

console.log('daily-logs.department tests passed')
