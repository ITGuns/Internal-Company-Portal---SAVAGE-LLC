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

// ---------------------------------------------------------------------------
// Intake provisioning webhook.
//
// Sent by the Gemfield site the moment a client completes the intake wizard, so
// the portal side (organization, project, client login) exists without a human
// copying a GF-ID across. Same HMAC scheme and the same shared secret as the
// progress webhook above - only the canonical field order differs, so a
// signature for one payload shape can never validate the other.

export interface GemfieldIntakePayload {
  gfId: string
  businessName: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  websiteUrl?: string | null
  tierLabel?: string | null
  at?: string | null
}

const INTAKE_FIELD_ORDER: Array<keyof GemfieldIntakePayload> = [
  'gfId',
  'businessName',
  'contactName',
  'contactEmail',
  'contactPhone',
  'websiteUrl',
  'tierLabel',
  'at',
]

/** Deterministic message string signed by both sender and receiver. */
export function canonicalGemfieldIntakeMessage(payload: GemfieldIntakePayload): string {
  return INTAKE_FIELD_ORDER.map((field) => {
    const value = payload[field]
    return value === undefined || value === null ? '' : String(value)
  }).join('\n')
}

export function signGemfieldIntakePayload(secret: string, payload: GemfieldIntakePayload): string {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(canonicalGemfieldIntakeMessage(payload), 'utf8')
    .digest('hex')
  return `sha256=${digest}`
}

/** Constant-time verification. Fails closed on missing secret or signature. */
export function verifyGemfieldIntakeSignature(
  secret: string | undefined,
  payload: GemfieldIntakePayload,
  providedSignature: string | undefined,
): boolean {
  if (!secret || !providedSignature) return false
  const expected = signGemfieldIntakePayload(secret, payload)
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(providedSignature, 'utf8')
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}
