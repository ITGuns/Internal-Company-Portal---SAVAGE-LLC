import assert from 'node:assert/strict'
import { ClientRoadmapAssetsService } from '../src/clients/client-roadmap-assets.service'
import type { CreateClientAssetInput } from '../src/clients/clients.validation'
import { ClientValidationError } from '../src/clients/clients.validation'

const assetInput: CreateClientAssetInput = {
  label: 'Logo package',
  url: 'https://example.com/logo.zip',
  type: 'brand',
  status: 'approved',
  notes: 'Use this version',
  projectId: undefined,
  visibleToClient: true,
}

function createServiceWithPrisma(prisma: unknown) {
  return new ClientRoadmapAssetsService(prisma as never)
}

async function runTests() {
  let createCalled = false
  const updatedAsset = { id: 'asset-1', ...assetInput, notes: 'Updated notes' }
  const updatePrisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      clientAsset: {
        findFirst: async (args: any) => {
          assert.deepEqual(args.where, {
            organizationId: 'org-1',
            projectId: null,
            label: assetInput.label,
            url: assetInput.url,
            type: assetInput.type,
          })
          return { id: 'asset-1' }
        },
        update: async (args: any) => {
          assert.equal(args.where.id, 'asset-1')
          assert.deepEqual(args.data, {
            status: assetInput.status,
            notes: assetInput.notes,
            visibleToClient: assetInput.visibleToClient,
          })
          return updatedAsset
        },
        create: async () => {
          createCalled = true
          return null
        },
      },
    }),
  }

  assert.deepEqual(await createServiceWithPrisma(updatePrisma).createAsset('org-1', assetInput), updatedAsset)
  assert.equal(createCalled, false)

  const createdAsset = { id: 'asset-2', organizationId: 'org-1', ...assetInput }
  const createPrisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      clientAsset: {
        findFirst: async () => null,
        update: async () => {
          throw new Error('update should not run when no asset exists')
        },
        create: async (args: any) => {
          assert.deepEqual(args.data, {
            organizationId: 'org-1',
            projectId: assetInput.projectId,
            label: assetInput.label,
            url: assetInput.url,
            type: assetInput.type,
            status: assetInput.status,
            notes: assetInput.notes,
            visibleToClient: assetInput.visibleToClient,
          })
          return createdAsset
        },
      },
    }),
  }

  assert.deepEqual(await createServiceWithPrisma(createPrisma).createAsset('org-1', assetInput), createdAsset)

  const uploadInput: CreateClientAssetInput = {
    ...assetInput,
    url: '/api/uploads/files/upload-1',
    uploadId: 'upload-1',
  }
  const uploadPrisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      storedUpload: {
        findFirst: async (args: any) => {
          assert.deepEqual(args.where, {
            id: 'upload-1',
            ownerId: 'owner-1',
            clientAsset: null,
            fileFolder: null,
          })
          return { id: 'upload-1' }
        },
      },
      clientAsset: {
        findFirst: async () => null,
        create: async (args: any) => {
          assert.equal(args.data.url, '/api/uploads/files/upload-1')
          assert.equal(args.data.uploadId, 'upload-1')
          return { id: 'asset-upload', ...args.data }
        },
      },
    }),
  }
  const uploadedAsset = await createServiceWithPrisma(uploadPrisma).createAsset('org-1', uploadInput, 'owner-1')
  assert.equal(uploadedAsset.uploadId, 'upload-1')

  const wrongOwnerPrisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      storedUpload: { findFirst: async () => null },
    }),
  }
  await assert.rejects(
    () => createServiceWithPrisma(wrongOwnerPrisma).createAsset('org-1', uploadInput, 'wrong-owner'),
    ClientValidationError,
  )
}

void runTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
