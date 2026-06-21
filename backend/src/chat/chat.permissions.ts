export interface ChatAccessPolicy {
  requesterId: string
  isPrivileged: boolean
}

export interface ConversationRequest {
  type?: string
  participantIds?: string[]
  name?: string
}

const PRIVILEGED_CONVERSATION_NAMES = new Set(['general', 'global'])
const PRIVILEGED_CONVERSATION_TYPES = new Set(['channel'])

export function isPrivilegedConversationName(name?: string): boolean {
  return PRIVILEGED_CONVERSATION_NAMES.has(String(name || '').trim().toLowerCase())
}

export function canCreateConversation(
  access: ChatAccessPolicy,
  request: ConversationRequest,
): boolean {
  const type = request.type || 'direct'
  const participantIds = request.participantIds || []

  if (!participantIds.includes(access.requesterId)) return false

  if (isPrivilegedConversationName(request.name)) {
    return access.isPrivileged
  }

  if (PRIVILEGED_CONVERSATION_TYPES.has(type)) {
    return access.isPrivileged
  }

  return true
}
