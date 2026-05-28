import { createClient, type RedisClientType } from 'redis'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import type { Store } from 'express-rate-limit'
import type { AuthRateLimitRoute, AuthRateLimitStoreFactory, AuthRateLimitStoreMode } from './rate-limits'

interface RedisRateLimitStoreOptions {
    nodeEnv: string
    prefix: string
    redisUrl: string
    storeMode: AuthRateLimitStoreMode
}

export function createRedisAuthRateLimitStoreFactory(
    client: Pick<RedisClientType, 'sendCommand'>,
    prefix: string,
): AuthRateLimitStoreFactory {
    return {
        mode: 'redis',
        createStore: (route: AuthRateLimitRoute): Store => new RedisStore({
            prefix: `${prefix}:${route}:`,
            sendCommand: async (...args: string[]) => client.sendCommand(args) as Promise<RedisReply>,
        }),
    }
}

export async function connectAuthRateLimitStoreFactory(
    options: RedisRateLimitStoreOptions,
): Promise<AuthRateLimitStoreFactory | undefined> {
    if (options.storeMode !== 'redis') {
        return undefined
    }

    const client = createClient({ url: options.redisUrl })

    client.on('error', (error) => {
        console.error('Redis rate limit client error:', error instanceof Error ? error.message : error)
    })

    try {
        await client.connect()
    } catch (error) {
        client.destroy()
        throw new Error(
            `Failed to connect Redis auth rate-limit store in ${options.nodeEnv}: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        )
    }

    const factory = createRedisAuthRateLimitStoreFactory(client, options.prefix)

    return {
        ...factory,
        shutdown: async () => {
            client.destroy()
        },
    }
}
