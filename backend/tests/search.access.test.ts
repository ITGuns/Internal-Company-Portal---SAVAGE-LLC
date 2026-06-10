import assert from 'node:assert/strict'
import {
  buildGlobalSearchAccess,
  normalizeGlobalSearchQuery,
} from '../src/search/search.access'

assert.equal(normalizeGlobalSearchQuery('  payroll   test  '), 'payroll test')
assert.equal(normalizeGlobalSearchQuery('x'.repeat(90)).length, 80)

const clientOnlyAccess = buildGlobalSearchAccess({
  requesterId: 'client-1',
  roles: [{ role: 'client_owner' }],
  memberships: [{ organizationId: 'org-1', status: 'active' }],
})

assert.equal(clientOnlyAccess.canSearchInternal, false)
assert.equal(clientOnlyAccess.canSearchInternalDirectory, false)
assert.equal(clientOnlyAccess.canSearchPayroll, false)
assert.equal(clientOnlyAccess.canSearchClientOperations, false)
assert.deepEqual(clientOnlyAccess.clientOrganizationIds, ['org-1'])

const financeAccess = buildGlobalSearchAccess({
  requesterId: 'finance-1',
  roles: [{ role: 'Bookkeeping', department: { name: 'Payroll / Finance' } }],
  memberships: [],
})

assert.equal(financeAccess.canSearchInternal, true)
assert.equal(financeAccess.canSearchPayroll, true)
assert.equal(financeAccess.canSearchClientOperations, false)
assert.deepEqual(financeAccess.departmentNames, ['Payroll / Finance'])

const clientOperationsAccess = buildGlobalSearchAccess({
  requesterId: 'web-1',
  roles: [{ role: 'Frontend Developer', department: { name: 'Website Developers' } }],
  memberships: [],
})

assert.equal(clientOperationsAccess.canSearchInternal, true)
assert.equal(clientOperationsAccess.canSearchPayroll, false)
assert.equal(clientOperationsAccess.canSearchClientOperations, true)

const configuredAdminAccess = buildGlobalSearchAccess({
  requesterId: 'admin-1',
  roles: [],
  memberships: [],
  isConfiguredAdminEmail: true,
})

assert.equal(configuredAdminAccess.canSearchInternal, true)
assert.equal(configuredAdminAccess.canSearchPayroll, true)
assert.equal(configuredAdminAccess.canSearchClientOperations, true)
assert.equal(configuredAdminAccess.canSearchAllFileDepartments, true)

console.log('search.access tests passed')
