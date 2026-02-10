import express, { Request, Response, Router } from 'express'
import fs from 'fs'
import path from 'path'
import { authenticateToken } from '../auth/auth.middleware'

export class UploadsController {
    router(): Router {
        const router = express.Router()

        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, '../../uploads')
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
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

        return router
    }
}
