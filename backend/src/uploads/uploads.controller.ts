import express, { Request, Response, Router } from 'express'
import fs from 'fs'
import path from 'path'
import { authenticateToken } from '../auth/auth.middleware'

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

        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                const { name, type, data } = req.body

                if (!name || !type || !data) {
                    return res.status(400).json({ error: 'Name, type, and data (base64) required' })
                }

                // Basic validation
                const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                if (!allowedTypes.includes(type)) {
                    return res.status(400).json({ error: 'Invalid file type' })
                }

                // Decode base64
                // Check if data has prefix
                let base64Data = data;
                const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
                if (matches && matches.length === 3) {
                    base64Data = matches[2];
                } else {
                    // Assume raw base64 if no prefix, or fail?
                    // Let's try to decode directly
                }

                const buffer = Buffer.from(base64Data, 'base64')
                const sizeInBytes = buffer.length
                if (sizeInBytes > 10 * 1024 * 1024) { // 10MB limit
                    return res.status(400).json({ error: 'File too large (max 10MB)' })
                }

                const timestamp = Date.now()
                const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
                const filename = `${timestamp}-${safeName}`
                const filepath = path.join(uploadDir, filename)

                fs.writeFileSync(filepath, buffer)

                const url = `/uploads/${filename}`
                res.status(201).json({ url, name: safeName, type, size: sizeInBytes })
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

                // Extract mime type and base64 data
                const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
                if (!matches || matches.length !== 3) {
                    return res.status(400).json({
                        error: 'Invalid base64 image format',
                        code: 'VALIDATION_ERROR'
                    })
                }

                const [, mimeType, base64Data] = matches
                const buffer = Buffer.from(base64Data, 'base64')

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

                // Validate mime type
                const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp']
                if (!allowedTypes.includes(mimeType.toLowerCase())) {
                    return res.status(400).json({
                        error: 'Invalid image type',
                        code: 'VALIDATION_ERROR',
                        details: {
                            allowed: allowedTypes,
                            received: mimeType
                        }
                    })
                }

                // Return the base64 string for storage in User.avatar
                // Frontend can store this directly in the database
                res.json({
                    avatar: image,
                    size: sizeInBytes,
                    type: `image/${mimeType}`
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
