import express, { Request, Response, Router } from 'express'
import fs from 'fs'
import path from 'path'
import { authenticateToken } from '../auth/auth.middleware'
import {
    buildStoredUploadMetadata,
    decodeBase64Payload,
    isGeneralUploadMimeType,
    normalizeMimeType,
    validateStoredUploadFilename,
    validateAvatarContent,
    validateUploadContent,
} from './upload.validation'

export class UploadsController {
    router(): Router {
        const router = express.Router()

        // Use /tmp for uploads on Vercel as the app directory is read-only
        const isVercel = process.env.VERCEL === '1'
        const uploadDir = isVercel
            ? path.join('/tmp', 'uploads')
            : path.join(__dirname, '../../uploads')

        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true })
            } catch (err) {
                console.warn('Failed to create uploads directory:', err)
            }
        }

        router.get('/files/:filename', authenticateToken, async (req: Request, res: Response) => {
            try {
                const fileValidation = validateStoredUploadFilename(req.params.filename)
                if (!fileValidation.valid || !fileValidation.filename || !fileValidation.contentType) {
                    return res.status(400).json({ error: fileValidation.error || 'Invalid filename' })
                }

                const filename = fileValidation.filename
                const filepath = path.join(uploadDir, filename)
                const resolvedUploadDir = path.resolve(uploadDir)
                const resolvedFilepath = path.resolve(filepath)

                if (!resolvedFilepath.startsWith(resolvedUploadDir + path.sep) || !fs.existsSync(resolvedFilepath)) {
                    return res.status(404).json({ error: 'File not found' })
                }

                res.setHeader('X-Content-Type-Options', 'nosniff')
                res.type(fileValidation.contentType)
                res.sendFile(resolvedFilepath)
            } catch (error) {
                console.error('File fetch error:', error)
                res.status(500).json({ error: 'Failed to fetch file' })
            }
        })

        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { name, type, data } = req.body

                if (!name || !type || !data) {
                    return res.status(400).json({ error: 'Name, type, and data (base64) required' })
                }

                const normalizedType = normalizeMimeType(type)
                if (!isGeneralUploadMimeType(normalizedType)) {
                    return res.status(400).json({ error: 'Invalid file type' })
                }

                const decoded = decodeBase64Payload(data)
                if (!decoded) {
                    return res.status(400).json({ error: 'Invalid base64 file data' })
                }

                if (decoded.mediaType && decoded.mediaType !== normalizedType) {
                    return res.status(400).json({ error: 'File data type does not match declared file type' })
                }

                const buffer = decoded.buffer
                const sizeInBytes = buffer.length
                if (sizeInBytes > 10 * 1024 * 1024) { // 10MB limit
                    return res.status(400).json({ error: 'File too large (max 10MB)' })
                }

                const validatedType = validateUploadContent(normalizedType, buffer)
                if (!validatedType) {
                    return res.status(400).json({ error: 'File content does not match declared file type' })
                }

                const uploadMetadata = buildStoredUploadMetadata(name, validatedType)
                if (!uploadMetadata) {
                    return res.status(400).json({ error: 'Invalid file name' })
                }

                const filepath = path.join(uploadDir, uploadMetadata.filename)

                fs.writeFileSync(filepath, buffer)

                const url = `/api/uploads/files/${uploadMetadata.filename}`
                res.status(201).json({
                    url,
                    filename: uploadMetadata.filename,
                    name: uploadMetadata.safeName,
                    type: uploadMetadata.contentType,
                    size: sizeInBytes,
                })
            } catch (error) {
                console.error('Upload error:', error)
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
                console.error('Avatar upload error:', error)
                res.status(500).json({
                    error: 'Failed to upload avatar',
                    code: 'SERVER_ERROR'
                })
            }
        })

        return router
    }
}
