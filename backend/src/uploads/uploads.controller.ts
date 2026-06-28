import express, { Request, Response, Router } from 'express'
import { AuthRequest, authenticateToken } from '../auth/auth.middleware'
import {
    buildStoredUploadMetadata,
    decodeBase64Payload,
    isGeneralUploadMimeType,
    normalizeMimeType,
    resolveGeneralUploadContentType,
    validateAvatarContent,
    validateUploadContent,
} from './upload.validation'
import { createLogger } from '../observability/logger'
import { createUploadStorage, type UploadStorage } from './upload.storage'
import { UploadsService } from './uploads.service'

const logger = createLogger('uploads.uploads.controller')


export class UploadsController {
    private readonly service: UploadsService

    constructor(private readonly storage: UploadStorage = createUploadStorage()) {
        this.service = new UploadsService(storage)
    }

    router(): Router {
        const router = express.Router()

        router.get('/files/:filename', authenticateToken, async (req: Request, res: Response) => {
            try {
                const uploadId = String(req.params.filename || '').trim()
                const user = (req as AuthRequest).user
                if (!uploadId || !user?.userId) return res.status(404).json({ error: 'File not found' })

                const storedFile = await this.service.readForUser(uploadId, user.userId, user.email)
                if (!storedFile) {
                    return res.status(404).json({ error: 'File not found' })
                }

                res.setHeader('X-Content-Type-Options', 'nosniff')
                res.type(storedFile.contentType)
                res.send(storedFile.buffer)
            } catch (error) {
                logger.error('File fetch error:', error)
                res.status(500).json({ error: 'Failed to fetch file' })
            }
        })

        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { name, type, data } = req.body

                if (!name || !data) {
                    return res.status(400).json({ error: 'Name and data (base64) are required' })
                }

                const decoded = decodeBase64Payload(data)
                if (!decoded) {
                    return res.status(400).json({ error: 'Invalid base64 file data' })
                }

                const resolvedType = resolveGeneralUploadContentType(name, type, decoded.mediaType)
                if (!resolvedType) {
                    return res.status(400).json({ error: 'Invalid file type' })
                }

                const normalizedPayloadType = normalizeMimeType(decoded.mediaType)
                if (
                    normalizedPayloadType
                    && isGeneralUploadMimeType(normalizedPayloadType)
                    && normalizedPayloadType !== resolvedType
                ) {
                    return res.status(400).json({ error: 'File data type does not match declared file type' })
                }

                const buffer = decoded.buffer
                const sizeInBytes = buffer.length
                if (sizeInBytes > 10 * 1024 * 1024) { // 10MB limit
                    return res.status(400).json({ error: 'File too large (max 10MB)' })
                }

                const validatedType = validateUploadContent(resolvedType, buffer)
                if (!validatedType) {
                    return res.status(400).json({ error: 'File content does not match declared file type' })
                }

                const uploadMetadata = buildStoredUploadMetadata(name, validatedType)
                if (!uploadMetadata) {
                    return res.status(400).json({ error: 'Invalid file name' })
                }

                const user = (req as AuthRequest).user
                if (!user?.userId) return res.status(401).json({ error: 'Authentication required' })

                const storedUpload = await this.service.create(
                    user.userId,
                    uploadMetadata.safeName,
                    uploadMetadata.contentType,
                    buffer,
                )

                const url = `/api/uploads/files/${storedUpload.id}`
                res.status(201).json({
                    id: storedUpload.id,
                    url,
                    filename: storedUpload.objectKey,
                    name: uploadMetadata.safeName,
                    type: uploadMetadata.contentType,
                    size: sizeInBytes,
                })
            } catch (error) {
                logger.error('Upload error:', error)
                res.status(500).json({ error: 'Failed to upload file' })
            }
        })

        // Dedicated avatar upload endpoint
        router.post('/avatar', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { image } = req.body

                if (!image) {
                    return res.status(400).json({
                        error: 'Image data required',
                        code: 'VALIDATION_ERROR'
                    })
                }

                // Validate base64 format with data URI
                if (!image.startsWith('data:image/')) {
                    return res.status(400).json({
                        error: 'Invalid image format. Must be a base64 data URI',
                        code: 'VALIDATION_ERROR',
                        details: { expected: 'data:image/[type];base64,[data]' }
                    })
                }

                const decoded = decodeBase64Payload(image)
                const mediaType = decoded?.mediaType || ''
                if (!decoded || !mediaType.startsWith('image/')) {
                    return res.status(400).json({
                        error: 'Invalid base64 image format',
                        code: 'VALIDATION_ERROR'
                    })
                }

                const buffer = decoded.buffer

                // Validate size (5MB max for avatars)
                const sizeInBytes = buffer.length
                if (sizeInBytes > 5 * 1024 * 1024) {
                    return res.status(400).json({
                        error: 'Image size must be less than 5MB',
                        code: 'VALIDATION_ERROR',
                        details: {
                            maxSize: '5MB',
                            actualSize: `${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB`
                        }
                    })
                }

                const avatarType = validateAvatarContent(mediaType, buffer)
                if (!avatarType) {
                    return res.status(400).json({
                        error: 'Image content does not match a supported image type',
                        code: 'VALIDATION_ERROR',
                        details: {
                            allowed: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
                            received: mediaType
                        }
                    })
                }

                // Return the base64 string for storage in User.avatar
                // Frontend can store this directly in the database
                res.json({
                    avatar: image,
                    size: sizeInBytes,
                    type: `image/${avatarType}`
                })

            } catch (error) {
                logger.error('Avatar upload error:', error)
                res.status(500).json({
                    error: 'Failed to upload avatar',
                    code: 'SERVER_ERROR'
                })
            }
        })

        return router
    }
}
