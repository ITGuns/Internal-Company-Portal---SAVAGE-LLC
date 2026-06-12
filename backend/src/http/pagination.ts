const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

type QueryValue = string | string[] | undefined

export interface ResolvedPagination {
    page: number
    limit: number
    hasExplicitPagination: boolean
}

function parsePositiveInteger(value: QueryValue): number | undefined {
    const rawValue = Array.isArray(value) ? value[0] : value
    if (!rawValue) return undefined

    const parsedValue = Number.parseInt(rawValue, 10)
    if (!Number.isFinite(parsedValue) || parsedValue < 1) return undefined

    return parsedValue
}

export function resolvePaginationQuery(
    query: { page?: QueryValue; limit?: QueryValue },
    options: { defaultLimit?: number; maxLimit?: number } = {},
): ResolvedPagination {
    const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT
    const maxLimit = options.maxLimit ?? MAX_LIMIT
    const requestedPage = parsePositiveInteger(query.page)
    const requestedLimit = parsePositiveInteger(query.limit)
    const limit = Math.min(requestedLimit ?? defaultLimit, maxLimit)

    return {
        page: requestedPage ?? DEFAULT_PAGE,
        limit,
        hasExplicitPagination: query.page !== undefined || query.limit !== undefined,
    }
}
