import { NextRequest, NextResponse } from 'next/server'

const isDevelopment = process.env.NODE_ENV !== 'production'

function getOrigin(value?: string): string | null {
  if (!value) return null

  try {
    return new URL(value.replace('ws://', 'http://').replace('wss://', 'https://')).origin
  } catch {
    return null
  }
}

function buildConnectSources(): string {
  const configuredOrigins = [
    getOrigin(process.env.BACKEND_URL),
    getOrigin(process.env.NEXT_PUBLIC_API_URL),
    getOrigin(process.env.NEXT_PUBLIC_WS_URL),
  ].filter(Boolean) as string[]

  const websocketOrigins = [process.env.NEXT_PUBLIC_WS_URL]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace('http://', 'ws://').replace('https://', 'wss://'))

  const developmentOrigins = isDevelopment
    ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:4000',
      'ws://localhost:4000',
      'ws://127.0.0.1:4000',
    ]
    : []

  return Array.from(new Set(["'self'", ...configuredOrigins, ...websocketOrigins, ...developmentOrigins])).join(' ')
}

function buildContentSecurityPolicy(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://lh3.googleusercontent.com https://cdn.discordapp.com https://ui-avatars.com https://i.pravatar.cc",
    "font-src 'self' data:",
    `connect-src ${buildConnectSources()}`,
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ]

  if (!isDevelopment) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|backend-auth|_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
    },
  ],
}
