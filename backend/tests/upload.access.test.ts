import assert from 'node:assert/strict'
import { canReadStoredUpload } from '../src/uploads/upload.access'
import { buildStoredUploadObjectKey } from '../src/uploads/upload.validation'

const ownerAccess = {
  requesterId: 'owner-user',
  isClientManager: false,
  clientOrganizationIds: [],
  canReadInternalDirectory: false,
  canReadAllDepartments: false,
  departments: [],
}

function runUploadAccessTests() {
  assert.equal(
    canReadStoredUpload(ownerAccess, { ownerId: 'owner-user' }),
    true,
    'the uploader can read an unlinked upload',
  )

  assert.equal(
    canReadStoredUpload({ ...ownerAccess, requesterId: 'other-user' }, { ownerId: 'owner-user' }),
    false,
    'an unrelated user cannot read an unlinked upload',
  )

  const visibleClientUpload = {
    ownerId: 'operations-user',
    clientAsset: {
      organizationId: 'client-org',
      visibleToClient: true,
    },
  }
  assert.equal(
    canReadStoredUpload({
      ...ownerAccess,
      requesterId: 'client-user',
      clientOrganizationIds: ['client-org'],
    }, visibleClientUpload),
    true,
    'an active client member can read a client-visible asset',
  )
  assert.equal(
    canReadStoredUpload({
      ...ownerAccess,
      requesterId: 'client-user',
      clientOrganizationIds: ['client-org'],
    }, {
      ...visibleClientUpload,
      clientAsset: { ...visibleClientUpload.clientAsset, visibleToClient: false },
    }),
    false,
    'a client member cannot read an internal asset',
  )
  assert.equal(
    canReadStoredUpload({ ...ownerAccess, requesterId: 'manager', isClientManager: true }, visibleClientUpload),
    true,
    'client operations can read linked client assets',
  )

  const departmentUpload = {
    ownerId: 'directory-uploader',
    fileFolder: { department: 'Engineering' },
  }
  assert.equal(
    canReadStoredUpload({
      ...ownerAccess,
      requesterId: 'engineer',
      canReadInternalDirectory: true,
      departments: ['Engineering'],
    }, departmentUpload),
    true,
    'an internal member can read files in an assigned department',
  )
  assert.equal(
    canReadStoredUpload({
      ...ownerAccess,
      requesterId: 'finance-user',
      canReadInternalDirectory: true,
      departments: ['Finance'],
    }, departmentUpload),
    false,
    'a member cannot cross department boundaries',
  )
  assert.equal(
    canReadStoredUpload({
      ...ownerAccess,
      requesterId: 'admin',
      canReadInternalDirectory: true,
      canReadAllDepartments: true,
    }, departmentUpload),
    true,
    'full-access users can read every internal directory department',
  )

  const objectKey = buildStoredUploadObjectKey('application/pdf', 'fixed-uuid')
  assert.equal(objectKey, 'fixed-uuid.pdf')
  assert.equal(objectKey.includes('Quarterly Report'), false)
}

runUploadAccessTests()
console.log('upload.access tests passed')
