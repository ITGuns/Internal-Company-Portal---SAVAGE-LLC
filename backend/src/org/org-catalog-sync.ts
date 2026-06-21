import { prisma } from '../database/prisma.service'
import { ORG_DEPARTMENT_ROLE_CATALOG } from './org-access-policy'

export interface OrgCatalogDepartmentRow {
  id: string
  name: string
}

export interface OrgCatalogRoleRow {
  id: string
  name: string
  departmentId: string | null
}

export interface OrgCatalogSyncClient {
  department: {
    upsert(args: {
      where: { name: string }
      update: Record<string, never>
      create: { name: string; driveId: string | null }
    }): Promise<OrgCatalogDepartmentRow>
  }
  availableRole: {
    upsert(args: {
      where: { name_departmentId: { name: string; departmentId: string } }
      update: Record<string, never>
      create: { name: string; departmentId: string }
    }): Promise<OrgCatalogRoleRow>
  }
}

export interface OrgCatalogSyncResult {
  departments: OrgCatalogDepartmentRow[]
  roles: OrgCatalogRoleRow[]
}

export async function syncOrgCatalog(
  client: OrgCatalogSyncClient = prisma,
): Promise<OrgCatalogSyncResult> {
  const departments: OrgCatalogDepartmentRow[] = []
  const roles: OrgCatalogRoleRow[] = []

  for (const entry of ORG_DEPARTMENT_ROLE_CATALOG) {
    const department = await client.department.upsert({
      where: { name: entry.department },
      update: {},
      create: {
        name: entry.department,
        driveId: null,
      },
    })
    departments.push(department)

    for (const roleName of entry.roles) {
      const role = await client.availableRole.upsert({
        where: {
          name_departmentId: {
            name: roleName,
            departmentId: department.id,
          },
        },
        update: {},
        create: {
          name: roleName,
          departmentId: department.id,
        },
      })
      roles.push(role)
    }
  }

  return { departments, roles }
}
