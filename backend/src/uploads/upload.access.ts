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
    // Gemfield Bridge: attachments on a client ticket, scoped to the ticket's organization.
    ticketAttachment?: {
        organizationId: string
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

    // Ticket attachments are visible to staff and to any active member of the ticket's
    // organization (client tickets are org-wide). Cross-org and non-member callers - including
    // plain Deskii clients - are denied, so org A's attachments are unfetchable by org B.
    if (upload.ticketAttachment) {
        return access.isClientManager
            || access.clientOrganizationIds.includes(upload.ticketAttachment.organizationId)
    }

    if (upload.fileFolder) {
        return access.canReadInternalDirectory && (
            access.canReadAllDepartments
            || access.departments.includes(upload.fileFolder.department)
        )
    }

    return false
}
