import crypto from 'node:crypto'

// The progress webhook is machine-to-machine (the build pipeline / progress-push script), so it
// is authenticated by an HMAC signature rather than a user session. We sign a CANONICAL MESSAGE
// built from the payload fields in a fixed order - not the raw request body - so verification is
// independent of JSON key ordering and the app's global body parser.

export interface GemfieldProgressPayload {
  gfId: string
  phase: string
  status?: string | null
  note?: string | null
  stagingUrl?: string | null
  liveUrl?: string | null
  at?: string | null
}

const FIELD_ORDER: Array<keyof GemfieldProgressPayload> = [
  'gfId',
  'phase',
  'status',
  'stagingUrl',
  'liveUrl',
  'note',
  'at',
]

/** Deterministic message string signed by both sender and receiver. */
export function canonicalGemfieldMessage(payload: GemfieldProgressPayload): string {
  return FIELD_ORDER.map((field) => {
    const value = payload[field]
    return value === undefined || value === null ? '' : String(value)
  }).join('\n')
}

export function signGemfieldPayload(secret: string, payload: GemfieldProgressPayload): string {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(canonicalGemfieldMessage(payload), 'utf8')
    .digest('hex')
  return `sha256=${digest}`
}

/** Constant-time verification. Fails closed on missing secret or signature. */
export function verifyGemfieldSignature(
  secret: string | undefined,
  payload: GemfieldProgressPayload,
  providedSignature: string | undefined,
): boolean {
  if (!secret || !providedSignature) return false
  const expected = signGemfieldPayload(secret, payload)
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(providedSignature, 'utf8')
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}
