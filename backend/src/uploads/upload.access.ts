export interface StoredUploadAccessContext {
    requesterId: string
    isClientManager: boolean
    clientOrganizationIds: string[]
    canReadInternalDirectory: boolean
    canReadAllDepartments: boolean
    departments: string[]
}

export interface StoredUploadAccessRecord {
    ownerId: string | null
    clientAsset?: {
        organizationId: string
        visibleToClient: boolean
    } | null
    fileFolder?: {
        department: string
    } | null
}

export function canReadStoredUpload(
    access: StoredUploadAccessContext,
    upload: StoredUploadAccessRecord,
): boolean {
    if (upload.ownerId === access.requesterId) return true

    if (upload.clientAsset) {
        return access.isClientManager || (
            upload.clientAsset.visibleToClient
            && access.clientOrganizationIds.includes(upload.clientAsset.organizationId)
        )
    }

    if (upload.fileFolder) {
        return access.canReadInternalDirectory && (
            access.canReadAllDepartments
            || access.departments.includes(upload.fileFolder.department)
        )
    }

    return false
}
