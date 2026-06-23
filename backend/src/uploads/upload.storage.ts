import fs from 'fs/promises'
import path from 'path'
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
    S3Client,
    type S3ClientConfig,
} from '@aws-sdk/client-s3'

export type UploadStorageDriver = 'local' | 's3'

export interface UploadStorageConfig {
    driver: UploadStorageDriver
    uploadDir?: string
    bucket?: string
    region?: string
    endpoint?: string
    forcePathStyle?: boolean
}

export interface StoredUpload {
    buffer: Buffer
    contentType: string
}

export interface SaveUploadInput {
    filename: string
    contentType: string
    buffer: Buffer
}

export interface UploadStorage {
    healthCheck(): Promise<boolean>
    save(input: SaveUploadInput): Promise<void>
    read(filename: string): Promise<StoredUpload | null>
    delete(filename: string): Promise<void>
}

function normalizeBoolean(value: string | undefined): boolean {
    return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

export function resolveUploadStorageConfig(env: NodeJS.ProcessEnv): UploadStorageConfig {
    const driver = (env.UPLOAD_STORAGE_DRIVER || 'local').trim().toLowerCase()

    if (driver !== 'local' && driver !== 's3') {
        throw new Error('UPLOAD_STORAGE_DRIVER must be local or s3')
    }

    if (driver === 'local') {
        return { driver: 'local' }
    }

    const bucket = env.UPLOAD_S3_BUCKET?.trim()
    if (!bucket) {
        throw new Error('UPLOAD_S3_BUCKET is required when UPLOAD_STORAGE_DRIVER=s3')
    }

    return {
        driver: 's3',
        bucket,
        region: env.UPLOAD_S3_REGION?.trim() || 'auto',
        endpoint: env.UPLOAD_S3_ENDPOINT?.trim() || undefined,
        forcePathStyle: normalizeBoolean(env.UPLOAD_S3_FORCE_PATH_STYLE),
    }
}

export function getDefaultUploadDirectory(): string {
    return process.env.VERCEL === '1'
        ? path.join('/tmp', 'uploads')
        : path.join(__dirname, '../../uploads')
}

export class LocalUploadStorage implements UploadStorage {
    constructor(private readonly uploadDir = getDefaultUploadDirectory()) {}

    async ensureDirectory(): Promise<void> {
        await fs.mkdir(this.uploadDir, { recursive: true })
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.ensureDirectory()
            await fs.access(this.uploadDir)
            return true
        } catch {
            return false
        }
    }

    private resolvePath(filename: string): string {
        const resolvedUploadDir = path.resolve(this.uploadDir)
        const resolvedFilepath = path.resolve(path.join(this.uploadDir, filename))

        if (!resolvedFilepath.startsWith(resolvedUploadDir + path.sep)) {
            throw new Error('Invalid upload path')
        }

        return resolvedFilepath
    }

    async save(input: SaveUploadInput): Promise<void> {
        await this.ensureDirectory()
        await fs.writeFile(this.resolvePath(input.filename), input.buffer)
    }

    async read(filename: string): Promise<StoredUpload | null> {
        try {
            const buffer = await fs.readFile(this.resolvePath(filename))
            return { buffer, contentType: '' }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
            throw error
        }
    }

    async delete(filename: string): Promise<void> {
        try {
            await fs.rm(this.resolvePath(filename))
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
    }
}

export class MemoryUploadStorage implements UploadStorage {
    private readonly files = new Map<string, StoredUpload>()

    async healthCheck(): Promise<boolean> {
        return true
    }

    async save(input: SaveUploadInput): Promise<void> {
        this.files.set(input.filename, {
            buffer: Buffer.from(input.buffer),
            contentType: input.contentType,
        })
    }

    async read(filename: string): Promise<StoredUpload | null> {
        const file = this.files.get(filename)
        return file ? { buffer: Buffer.from(file.buffer), contentType: file.contentType } : null
    }

    async delete(filename: string): Promise<void> {
        this.files.delete(filename)
    }
}

export class S3UploadStorage implements UploadStorage {
    private readonly client: S3Client

    constructor(private readonly config: Required<Pick<UploadStorageConfig, 'bucket'>> & UploadStorageConfig) {
        const clientConfig: S3ClientConfig = {
            region: config.region || 'auto',
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
        }
        this.client = new S3Client(clientConfig)
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }))
            return true
        } catch {
            return false
        }
    }

    async save(input: SaveUploadInput): Promise<void> {
        await this.client.send(new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: input.filename,
            Body: input.buffer,
            ContentType: input.contentType,
        }))
    }

    async read(filename: string): Promise<StoredUpload | null> {
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: filename,
            }))
            const body = response.Body
            if (!body || typeof (body as any).transformToByteArray !== 'function') {
                return null
            }

            const bytes = await (body as any).transformToByteArray()
            return {
                buffer: Buffer.from(bytes),
                contentType: response.ContentType || 'application/octet-stream',
            }
        } catch (error) {
            const name = (error as { name?: string }).name
            if (name === 'NoSuchKey' || name === 'NotFound') return null
            throw error
        }
    }

    async delete(filename: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: filename,
        }))
    }
}

export function createUploadStorage(config = resolveUploadStorageConfig(process.env)): UploadStorage {
    if (config.driver === 's3') {
        return new S3UploadStorage({
            ...config,
            bucket: config.bucket || '',
        })
    }

    return new LocalUploadStorage(config.uploadDir)
}
