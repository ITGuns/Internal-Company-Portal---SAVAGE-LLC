export const GENERAL_UPLOAD_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export type GeneralUploadMimeType = typeof GENERAL_UPLOAD_MIME_TYPES[number]
export type AvatarImageType = 'jpeg' | 'png' | 'gif' | 'webp'

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const MAX_STORED_AVATAR_LENGTH = 2048
const MAX_UPLOAD_BASENAME_LENGTH = 120

const GENERAL_UPLOAD_EXTENSION_BY_TYPE: Record<GeneralUploadMimeType, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

const GENERAL_UPLOAD_TYPE_BY_EXTENSION: Record<string, GeneralUploadMimeType> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

const GENERIC_BROWSER_UPLOAD_MIME_TYPES = new Set([
    '',
    'application/octet-stream',
    'binary/octet-stream',
])

interface DecodedBase64Payload {
    buffer: Buffer
    mediaType?: string
}

export interface AvatarValueValidationResult {
    valid: boolean
    value?: string
    type?: AvatarImageType
    avatarType?: AvatarImageType
    sizeBytes?: number
    error?: string
}

interface StoredUploadMetadata {
    filename: string
    safeName: string
    contentType: GeneralUploadMimeType
}

interface StoredUploadFilenameValidationResult {
    valid: boolean
    filename?: string
    contentType?: GeneralUploadMimeType
    error?: string
}

const DATA_URI_PATTERN = /^data:([A-Za-z0-9][A-Za-z0-9.+/-]*);base64,([\s\S]+)$/
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/
const STORED_UPLOAD_FILENAME_PATTERN = /^\d{10,}-[a-z0-9](?:[a-z0-9._-]{0,119}[a-z0-9])?\.([a-z0-9]+)$/
const AVATAR_INITIALS_PATTERN = /^[A-Za-z0-9]{1,3}$/
const UNSAFE_AVATAR_REFERENCE_PATTERN = /[\s\\\u0000-\u001f\u007f]/

export function normalizeMimeType(type: unknown): string {
    if (typeof type !== 'string') return ''
    const normalized = type.trim().toLowerCase()
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

export function normalizeAvatarImageType(type: unknown): string {
    if (typeof type !== 'string') return ''
    const normalized = type.trim().toLowerCase().replace(/^image\//, '')
    return normalized === 'jpg' ? 'jpeg' : normalized
}

export function decodeBase64Payload(payload: unknown): DecodedBase64Payload | null {
    if (typeof payload !== 'string') return null

    const trimmed = payload.trim()
    const dataUriMatch = trimmed.match(DATA_URI_PATTERN)
    const mediaType = dataUriMatch ? normalizeMimeType(dataUriMatch[1]) : undefined
    const base64Payload = (dataUriMatch ? dataUriMatch[2] : trimmed).replace(/\s/g, '')

    if (!base64Payload || base64Payload.length % 4 !== 0 || !BASE64_PATTERN.test(base64Payload)) {
        return null
    }

    const buffer = Buffer.from(base64Payload, 'base64')
    if (buffer.length === 0) return null

    return { buffer, mediaType }
}

export function isGeneralUploadMimeType(type: unknown): type is GeneralUploadMimeType {
    return (GENERAL_UPLOAD_MIME_TYPES as readonly string[]).includes(normalizeMimeType(type))
}

export function isGenericBrowserUploadMimeType(type: unknown): boolean {
    return GENERIC_BROWSER_UPLOAD_MIME_TYPES.has(normalizeMimeType(type))
}

export function resolveGeneralUploadContentType(
    filename: unknown,
    declaredType: unknown,
    payloadMediaType?: unknown,
): GeneralUploadMimeType | null {
    const normalizedDeclaredType = normalizeMimeType(declaredType)
    const normalizedPayloadType = normalizeMimeType(payloadMediaType)

    if (
        normalizedPayloadType
        && !isGenericBrowserUploadMimeType(normalizedPayloadType)
        && !isGeneralUploadMimeType(normalizedPayloadType)
    ) {
        return null
    }

    if (
        isGeneralUploadMimeType(normalizedDeclaredType)
        && isGeneralUploadMimeType(normalizedPayloadType)
        && normalizedDeclaredType !== normalizedPayloadType
    ) {
        return null
    }

    if (isGeneralUploadMimeType(normalizedDeclaredType)) {
        return normalizedDeclaredType
    }

    if (isGeneralUploadMimeType(normalizedPayloadType)) {
        return normalizedPayloadType
    }

    if (!normalizedDeclaredType || isGenericBrowserUploadMimeType(normalizedDeclaredType)) {
        return getUploadContentTypeForFilename(filename)
    }

    return null
}

export function validateUploadContent(type: unknown, buffer: Buffer): GeneralUploadMimeType | null {
    const normalizedType = normalizeMimeType(type)
    if (!isGeneralUploadMimeType(normalizedType)) return null

    return hasExpectedSignature(normalizedType, buffer)
        ? normalizedType as GeneralUploadMimeType
        : null
}

export function getUploadExtensionForMimeType(type: unknown): string | null {
    const normalizedType = normalizeMimeType(type)
    if (!isGeneralUploadMimeType(normalizedType)) return null

    return GENERAL_UPLOAD_EXTENSION_BY_TYPE[normalizedType]
}

export function getUploadContentTypeForFilename(filename: unknown): GeneralUploadMimeType | null {
    if (typeof filename !== 'string') return null

    const extension = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
    if (!extension) return null

    return GENERAL_UPLOAD_TYPE_BY_EXTENSION[extension] ?? null
}

export function buildStoredUploadMetadata(
    originalName: unknown,
    contentType: unknown,
    timestamp = Date.now()
): StoredUploadMetadata | null {
    const normalizedType = normalizeMimeType(contentType)
    if (!isGeneralUploadMimeType(normalizedType)) return null

    const extension = getUploadExtensionForMimeType(normalizedType)
    if (!extension) return null

    const baseName = sanitizeUploadBaseName(originalName)
    if (!baseName) return null

    const safeName = `${baseName}.${extension}`
    const safeTimestamp = Number.isFinite(timestamp) ? Math.trunc(timestamp) : Date.now()

    return {
        filename: `${safeTimestamp}-${safeName}`,
        safeName,
        contentType: normalizedType,
    }
}

export function buildStoredUploadObjectKey(
    contentType: unknown,
    uniqueId: string = crypto.randomUUID(),
): string | null {
    const normalizedType = normalizeMimeType(contentType)
    if (!isGeneralUploadMimeType(normalizedType)) return null

    const extension = getUploadExtensionForMimeType(normalizedType)
    return extension ? `${uniqueId}.${extension}` : null
}

export function validateStoredUploadFilename(filename: unknown): StoredUploadFilenameValidationResult {
    if (typeof filename !== 'string') {
        return { valid: false, error: 'Filename must be a string' }
    }

    const normalized = filename.trim()
    if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
        return { valid: false, error: 'Invalid filename' }
    }

    const match = normalized.match(STORED_UPLOAD_FILENAME_PATTERN)
    if (!match) {
        return { valid: false, error: 'Invalid filename' }
    }

    const contentType = getUploadContentTypeForFilename(normalized)
    if (!contentType) {
        return { valid: false, error: 'Unsupported file type' }
    }

    return { valid: true, filename: normalized, contentType }
}

export function validateAvatarContent(type: unknown, buffer: Buffer): AvatarImageType | null {
    const normalizedType = normalizeAvatarImageType(type)
    const isAllowed = ['jpeg', 'png', 'gif', 'webp'].includes(normalizedType)
    if (!isAllowed) return null

    return hasExpectedAvatarSignature(normalizedType, buffer)
        ? normalizedType as AvatarImageType
        : null
}

export function validateStoredAvatarValue(value: unknown): AvatarValueValidationResult {
    if (typeof value !== 'string') {
        return { valid: false, error: 'Avatar must be a string' }
    }

    const avatar = value.trim()
    if (avatar === '') {
        return { valid: true, value: '' }
    }

    if (avatar.startsWith('data:')) {
        const decoded = decodeBase64Payload(avatar)
        const mediaType = decoded?.mediaType || ''
        if (!decoded || !mediaType.startsWith('image/')) {
            return { valid: false, error: 'Avatar data must be a base64 image data URI' }
        }

        if (decoded.buffer.length > MAX_AVATAR_SIZE_BYTES) {
            return { valid: false, error: 'Avatar image must be less than 5MB' }
        }

        const type = validateAvatarContent(mediaType, decoded.buffer)
        if (!type) {
            return { valid: false, error: 'Avatar content does not match a supported image type' }
        }

        return { valid: true, value: avatar, type, avatarType: type, sizeBytes: decoded.buffer.length }
    }

    if (avatar.length > MAX_STORED_AVATAR_LENGTH) {
        return { valid: false, error: 'Avatar value is too long' }
    }

    if (isAllowedAvatarReference(avatar)) {
        return { valid: true, value: avatar }
    }

    return { valid: false, error: 'Avatar must be initials, an http(s) URL, relative path, or supported image data URI' }
}

export function validateAvatarValue(value: unknown): AvatarValueValidationResult {
    return validateStoredAvatarValue(value)
}

function hasExpectedSignature(type: GeneralUploadMimeType, buffer: Buffer): boolean {
    switch (type) {
        case 'image/png':
            return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        case 'image/jpeg':
            return startsWith(buffer, [0xff, 0xd8, 0xff])
        case 'image/gif':
            return startsWithAscii(buffer, 'GIF87a') || startsWithAscii(buffer, 'GIF89a')
        case 'application/pdf':
            return startsWithAscii(buffer, '%PDF-')
        case 'application/msword':
            return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return hasDocxSignature(buffer)
        case 'text/plain':
            return isLikelyText(buffer)
    }
}

function hasExpectedAvatarSignature(type: string, buffer: Buffer): boolean {
    switch (type) {
        case 'jpeg':
            return startsWith(buffer, [0xff, 0xd8, 0xff])
        case 'png':
            return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        case 'gif':
            return startsWithAscii(buffer, 'GIF87a') || startsWithAscii(buffer, 'GIF89a')
        case 'webp':
            return startsWithAscii(buffer, 'RIFF') && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        default:
            return false
    }
}

function hasDocxSignature(buffer: Buffer): boolean {
    if (!startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return false

    const searchable = buffer.toString('latin1')
    return searchable.includes('[Content_Types].xml') && searchable.includes('word/')
}

function cleanUtf8Sample(buffer: Buffer): Buffer {
    const len = buffer.length
    if (len === 0) return buffer

    for (let i = 1; i <= Math.min(len, 4); i++) {
        const byte = buffer[len - i]
        if ((byte & 0x80) === 0x00) {
            break
        }
        if ((byte & 0xC0) === 0xC0) {
            let expectedBytes = 0
            if ((byte & 0xE0) === 0xC0) expectedBytes = 2
            else if ((byte & 0xF0) === 0xE0) expectedBytes = 3
            else if ((byte & 0xF8) === 0xF0) expectedBytes = 4

            if (i < expectedBytes) {
                return buffer.subarray(0, len - i)
            }
            break
        }
    }
    return buffer
}

function isLikelyText(buffer: Buffer): boolean {
    if (buffer.length === 0) return false

    const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
    let controlCharacters = 0

    for (const byte of sample) {
        if (byte === 0) return false
        const isAllowedWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d
        if (!isAllowedWhitespace && (byte < 0x20 || byte === 0x7f)) {
            controlCharacters += 1
        }
    }

    if (controlCharacters / sample.length > 0.01) return false

    const cleanedSample = cleanUtf8Sample(sample)
    const decoded = cleanedSample.toString('utf8')
    return !decoded.includes('\ufffd')
}

function isAllowedAvatarReference(value: string): boolean {
    if (UNSAFE_AVATAR_REFERENCE_PATTERN.test(value)) {
        return false
    }

    if (AVATAR_INITIALS_PATTERN.test(value)) {
        return true
    }

    if (value.startsWith('/') && !value.startsWith('//')) {
        return true
    }

    try {
        const url = new URL(value)
        return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
    } catch {
        return false
    }
}

function sanitizeUploadBaseName(originalName: unknown): string | null {
    if (typeof originalName !== 'string') return null

    const fileName = originalName.trim().split(/[\\/]/).pop() || ''
    const baseName = fileName.replace(/\.[^.]*$/, '')
    const sanitized = baseName
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
        .slice(0, MAX_UPLOAD_BASENAME_LENGTH)

    return sanitized || 'upload'
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false
    return signature.every((byte, index) => buffer[index] === byte)
}

function startsWithAscii(buffer: Buffer, signature: string): boolean {
    return buffer.subarray(0, signature.length).toString('ascii') === signature
}
import crypto from 'node:crypto'
