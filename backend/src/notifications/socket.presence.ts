export interface PresenceSocketLike {
    data?: {
        user?: {
            userId?: string
        }
    }
}

export function collectOnlineUserIds(sockets: PresenceSocketLike[]): string[] {
    const userIds = sockets
        .map((socket) => socket.data?.user?.userId)
        .filter((userId): userId is string => Boolean(userId))

    return Array.from(new Set(userIds)).sort()
}
