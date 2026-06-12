import assert from 'node:assert/strict'
import { ClientsService } from '../src/clients/clients.service'
import type { CreateClientAssetInput } from '../src/clients/clients.validation'

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
  const service = new ClientsService() as any
  service.prisma = prisma
  service.assertProjectBelongsToOrganization = async () => undefined
  return service as ClientsService
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
}

void runTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
