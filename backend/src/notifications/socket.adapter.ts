import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import type { Server as SocketIOServer } from 'socket.io'
import { createLogger } from '../observability/logger'

const logger = createLogger('notifications.socket.adapter')

export interface SocketRedisAdapterValidationOptions {
    enabled: boolean
    redisUrl: string
}

export function shouldEnableSocketRedisAdapter(nodeEnv: string, requestedValue?: string): boolean {
    if (requestedValue === undefined || requestedValue.trim() === '') {
        return nodeEnv === 'production'
    }

    const normalized = requestedValue.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false

    throw new Error('ENABLE_SOCKET_REDIS_ADAPTER must be true or false')
}

export function validateSocketRedisAdapterConfig(options: SocketRedisAdapterValidationOptions): void {
    if (options.enabled && !options.redisUrl) {
        throw new Error('REDIS_URL is required when ENABLE_SOCKET_REDIS_ADAPTER=true')
    }
}

export async function configureSocketRedisAdapter(
    io: SocketIOServer,
    options: SocketRedisAdapterValidationOptions & { nodeEnv: string },
): Promise<void> {
    validateSocketRedisAdapterConfig(options)

    if (!options.enabled) {
        logger.info('Socket.io Redis adapter disabled')
        return
    }

    const publisher = createClient({ url: options.redisUrl })
    const subscriber = publisher.duplicate()

    publisher.on('error', (error) => logger.error('Socket Redis publisher error', error))
    subscriber.on('error', (error) => logger.error('Socket Redis subscriber error', error))

    try {
        await Promise.all([publisher.connect(), subscriber.connect()])
        io.adapter(createAdapter(publisher, subscriber))
        logger.info('Socket.io Redis adapter enabled')
    } catch (error) {
        await Promise.allSettled([publisher.quit(), subscriber.quit()])

        if (options.nodeEnv === 'production') {
            throw error
        }

        logger.warn('Socket.io Redis adapter unavailable; continuing without cluster adapter', error)
    }
}
