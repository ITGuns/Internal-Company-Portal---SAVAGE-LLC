import type { JwtPayload } from '../auth/jwt.service'

const MAX_CONVERSATION_ID_LENGTH = 128
const SAFE_CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export interface ParticipantRepository {
    findUnique(args: {
        where: {
            conversationId_userId: {
                conversationId: string
                userId: string
            }
        }
        select: { id: true }
    }): Promise<{ id: string } | null>
}

export interface TypingEventPayload {
    conversationId: string
    userId: string
    userName: string
}

export function normalizeSocketConversationId(value: unknown): string | null {
    if (typeof value !== 'string') return null

    const conversationId = value.trim()

    if (!conversationId || conversationId.length > MAX_CONVERSATION_ID_LENGTH) return null
    if (!SAFE_CONVERSATION_ID_PATTERN.test(conversationId)) return null

    return conversationId
}

export function buildAuthorizedTypingPayload(
    data: unknown,
    socketUser: JwtPayload,
): TypingEventPayload | null {
    if (!data || typeof data !== 'object') return null

    const conversationId = normalizeSocketConversationId(
        (data as { conversationId?: unknown }).conversationId,
    )

    if (!conversationId || !socketUser.userId) return null

    return {
        conversationId,
        userId: socketUser.userId,
        userName: socketUser.name?.trim() || socketUser.email,
    }
}

export async function isAuthorizedConversationParticipant(
    participantRepository: ParticipantRepository,
    conversationIdValue: unknown,
    userId: string,
): Promise<boolean> {
    const conversationId = normalizeSocketConversationId(conversationIdValue)
    if (!conversationId || !userId) return false

    const participant = await participantRepository.findUnique({
        where: {
            conversationId_userId: {
                conversationId,
                userId,
            },
        },
        select: { id: true },
    })

    return Boolean(participant)
}
