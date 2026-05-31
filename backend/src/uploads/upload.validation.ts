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

export interface StoredAvatarValidationResult {
    valid: boolean
    error?: string
    sizeBytes?: number
    avatarType?: AvatarImageType
}

interface DecodedBase64Payload {
    buffer: Buffer
    mediaType?: string
}

const DATA_URI_PATTERN = /^data:([A-Za-z0-9][A-Za-z0-9.+/-]*);base64,([\s\S]+)$/
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/
const DEFAULT_AVATAR_MAX_BYTES = 5 * 1024 * 1024

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

    const canonicalInput = base64Payload.replace(/=+$/, '')
    const canonicalOutput = buffer.toString('base64').replace(/=+$/, '')
    if (canonicalInput !== canonicalOutput) return null

    return { buffer, mediaType }
}

export function isGeneralUploadMimeType(type: unknown): type is GeneralUploadMimeType {
    return (GENERAL_UPLOAD_MIME_TYPES as readonly string[]).includes(normalizeMimeType(type))
}

export function validateUploadContent(type: unknown, buffer: Buffer): GeneralUploadMimeType | null {
    const normalizedType = normalizeMimeType(type)
    if (!isGeneralUploadMimeType(normalizedType)) return null

    return hasExpectedSignature(normalizedType, buffer)
        ? normalizedType as GeneralUploadMimeType
        : null
}

export function validateAvatarContent(type: unknown, buffer: Buffer): AvatarImageType | null {
    const normalizedType = normalizeAvatarImageType(type)
    const isAllowed = ['jpeg', 'png', 'gif', 'webp'].includes(normalizedType)
    if (!isAllowed) return null

    return hasExpectedAvatarSignature(normalizedType, buffer)
        ? normalizedType as AvatarImageType
        : null
}

export function validateStoredAvatarValue(
    value: unknown,
    maxBytes = DEFAULT_AVATAR_MAX_BYTES
): StoredAvatarValidationResult {
    if (typeof value !== 'string') {
        return { valid: false, error: 'Avatar data must be a string' }
    }

    if (!value || !value.startsWith('data:image/')) {
        return { valid: true }
    }

    const decoded = decodeBase64Payload(value)
    const mediaType = decoded?.mediaType || ''
    if (!decoded || !mediaType.startsWith('image/')) {
        return { valid: false, error: 'Invalid base64 image format' }
    }

    const sizeBytes = decoded.buffer.length
    if (sizeBytes > maxBytes) {
        return { valid: false, error: 'Avatar image must be less than 5MB', sizeBytes }
    }

    const avatarType = validateAvatarContent(mediaType, decoded.buffer)
    if (!avatarType) {
        return { valid: false, error: 'Avatar content does not match a supported image type', sizeBytes }
    }

    return { valid: true, sizeBytes, avatarType }
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

    const decoded = sample.toString('utf8')
    return !decoded.includes('\ufffd')
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false
    return signature.every((byte, index) => buffer[index] === byte)
}

function startsWithAscii(buffer: Buffer, signature: string): boolean {
    return buffer.subarray(0, signature.length).toString('ascii') === signature
}
