import type { Express, NextFunction, Request, Response } from 'express'
import bodyParser from 'body-parser'

export const DEFAULT_JSON_BODY_LIMIT = '1mb'
export const LARGE_JSON_BODY_LIMIT = '16mb'

const LARGE_JSON_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])
const LARGE_JSON_BODY_PATHS = [
  /^\/api\/uploads(?:\/.*)?$/,
  /^\/api\/users(?:\/[^/]+)?(?:\/avatar)?$/,
  /^\/api\/employees(?:\/request-verification)?$/,
]

export function shouldUseLargeJsonBodyLimit(req: Pick<Request, 'method' | 'path'>): boolean {
  if (!LARGE_JSON_BODY_METHODS.has(req.method.toUpperCase())) {
    return false
  }

  return LARGE_JSON_BODY_PATHS.some((pattern) => pattern.test(req.path))
}

export function configureJsonBodyParsers(app: Express): void {
  const defaultJsonParser = bodyParser.json({ limit: DEFAULT_JSON_BODY_LIMIT })
  const largeJsonParser = bodyParser.json({ limit: LARGE_JSON_BODY_LIMIT })

  app.use((req: Request, res: Response, next: NextFunction) => {
    const parser = shouldUseLargeJsonBodyLimit(req) ? largeJsonParser : defaultJsonParser
    return parser(req, res, next)
  })
}
