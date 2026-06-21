type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

type LogContext = Record<string, unknown>

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 50,
}

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|session|api[_-]?key|client[_-]?secret|refresh/i
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi

function resolveLogLevel(): LogLevel {
    const rawLevel = (process.env.LOG_LEVEL || 'info').toLowerCase()

    if (rawLevel === 'debug' || rawLevel === 'info' || rawLevel === 'warn' || rawLevel === 'error' || rawLevel === 'silent') {
        return rawLevel
    }

    return 'info'
}

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[resolveLogLevel()]
}

function redactText(value: string): string {
    return value.replace(EMAIL_PATTERN, '[redacted-email]')
}

function sanitizeValue(value: unknown, key?: string, seen = new WeakSet<object>()): unknown {
    if (key && SENSITIVE_KEY_PATTERN.test(key)) {
        return '[redacted]'
    }

    if (typeof value === 'string') {
        return redactText(value)
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
        return value
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: redactText(value.message),
            stack: process.env.NODE_ENV === 'production' ? undefined : redactText(value.stack || ''),
        }
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, undefined, seen))
    }

    if (typeof value === 'object') {
        if (seen.has(value)) {
            return '[circular]'
        }

        seen.add(value)

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
                entryKey,
                sanitizeValue(entryValue, entryKey, seen),
            ]),
        )
    }

    return String(value)
}

function normalizeContext(context?: unknown): LogContext | undefined {
    if (context === undefined) {
        return undefined
    }

    if (context && typeof context === 'object' && !(context instanceof Error) && !Array.isArray(context)) {
        return sanitizeValue(context) as LogContext
    }

    return { detail: sanitizeValue(context) }
}

function writeLog(level: Exclude<LogLevel, 'silent'>, scope: string, message: unknown, context?: unknown): void {
    if (!shouldLog(level)) {
        return
    }

    const payload = {
        timestamp: new Date().toISOString(),
        level,
        scope,
        message: sanitizeValue(message),
        context: normalizeContext(context),
    }

    const line = JSON.stringify(payload)

    if (level === 'error') {
        console.error(line)
        return
    }

    if (level === 'warn') {
        console.warn(line)
        return
    }

    console.log(line)
}

export function createLogger(scope: string) {
    return {
        debug: (message: unknown, context?: unknown) => writeLog('debug', scope, message, context),
        info: (message: unknown, context?: unknown) => writeLog('info', scope, message, context),
        warn: (message: unknown, context?: unknown) => writeLog('warn', scope, message, context),
        error: (message: unknown, context?: unknown) => writeLog('error', scope, message, context),
    }
}

export const logger = createLogger('app')
