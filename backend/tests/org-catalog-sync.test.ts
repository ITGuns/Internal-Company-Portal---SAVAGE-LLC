import assert from 'node:assert/strict'
import { ORG_DEPARTMENT_ROLE_CATALOG } from '../src/org/org-access-policy'
import { syncOrgCatalog } from '../src/org/org-catalog-sync'

type DepartmentRow = {
  id: string
  name: string
  driveId?: string | null
}

type RoleRow = {
  id: string
  name: string
  departmentId: string
}

function createFakeOrgCatalogClient() {
  const departments: DepartmentRow[] = [
    { id: 'dept-existing-ops', name: 'Operations', driveId: 'existing-drive' },
  ]
  const roles: RoleRow[] = [
    { id: 'role-existing-ops-manager', name: 'Operations Manager', departmentId: 'dept-existing-ops' },
  ]
  let nextDepartment = 1
  let nextRole = 1

  return {
    departments,
    roles,
    client: {
      department: {
        upsert: async ({ where, create }: { where: { name: string }; create: { name: string; driveId?: string | null } }) => {
          const existing = departments.find((department) => department.name === where.name)
          if (existing) return existing

          const department = {
            id: `dept-${nextDepartment++}`,
            name: create.name,
            driveId: create.driveId ?? null,
          }
          departments.push(department)
          return department
        },
      },
      availableRole: {
        upsert: async ({
          where,
          create,
        }: {
          where: { name_departmentId: { name: string; departmentId: string } }
          create: { name: string; departmentId: string }
        }) => {
          const existing = roles.find((role) =>
            role.name === where.name_departmentId.name &&
            role.departmentId === where.name_departmentId.departmentId
          )
          if (existing) return existing

          const role = {
            id: `role-${nextRole++}`,
            name: create.name,
            departmentId: create.departmentId,
          }
          roles.push(role)
          return role
        },
      },
    },
  }
}

async function run() {
  const fake = createFakeOrgCatalogClient()

  const result = await syncOrgCatalog(fake.client)

  assert.equal(result.departments.length, ORG_DEPARTMENT_ROLE_CATALOG.length)
  assert.equal(fake.departments.length, ORG_DEPARTMENT_ROLE_CATALOG.length)
  assert.equal(fake.departments.find((department) => department.name === 'Operations')?.id, 'dept-existing-ops')
  assert.equal(fake.roles.filter((role) => role.name === 'Operations Manager').length, 1)

  const expectedRoleCount = ORG_DEPARTMENT_ROLE_CATALOG.reduce(
    (count, entry) => count + entry.roles.length,
    0,
  )
  assert.equal(fake.roles.length, expectedRoleCount)
  assert.ok(fake.departments.some((department) => department.name === 'Website Developers'))
  assert.ok(fake.roles.some((role) => role.name === 'Backend / Technical Developer'))

  console.log('org-catalog-sync tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
