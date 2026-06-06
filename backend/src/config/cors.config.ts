const DEVELOPMENT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function buildAllowedCorsOrigins(rawOrigin: string, nodeEnv: string): string[] {
  const configuredOrigins = parseCorsOrigins(rawOrigin)
  const origins = nodeEnv === 'production'
    ? configuredOrigins
    : [...configuredOrigins, ...DEVELOPMENT_LOCAL_ORIGINS]

  return Array.from(new Set(origins))
}

export function resolveCorsResponseOrigin(origin: string | undefined, allowedOrigins: string[]): string | undefined {
  if (allowedOrigins.includes('*')) return origin || '*'
  if (!origin) return allowedOrigins[0]
  return allowedOrigins.includes(origin) ? origin : undefined
}
