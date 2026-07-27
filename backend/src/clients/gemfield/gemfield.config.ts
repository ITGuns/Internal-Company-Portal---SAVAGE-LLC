// #S config for the Gemfield bridge - support phone, callback hours, and digest settings.
// Reads env with safe defaults so the CODE is complete; ops fills in the real values (never
// hardcoded). See docs/gemfield-bridge/BLOCKERS.md (#S).
//
//   GEMFIELD_SUPPORT_PHONE   e.g. +1-555-0100   (blank -> the "Call support" tel: button is hidden)
//   GEMFIELD_CALLBACK_HOURS  e.g. "weekdays 9am-5pm ET"
//   GEMFIELD_DIGEST_ENABLED  "true" | "false"   (default true)

function readEnv(key: string, fallback = ''): string {
  const value = process.env[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export interface GemfieldSupportConfig {
  supportPhone: string | null
  callbackHours: string | null
}

export function getGemfieldSupportConfig(): GemfieldSupportConfig {
  return {
    supportPhone: readEnv('GEMFIELD_SUPPORT_PHONE') || null,
    callbackHours: readEnv('GEMFIELD_CALLBACK_HOURS') || null,
  }
}

export function isGemfieldDigestEnabled(): boolean {
  return readEnv('GEMFIELD_DIGEST_ENABLED', 'true').toLowerCase() !== 'false'
}
