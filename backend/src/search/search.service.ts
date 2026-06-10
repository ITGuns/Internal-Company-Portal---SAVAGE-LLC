import type { GlobalSearchAccess } from './search.access'
import { searchClientRecords } from './search.clients'
import { searchInternalRecords, searchPeople } from './search.internal'
import { searchPayrollRecords } from './search.payroll'
import { DEFAULT_PER_GROUP_LIMIT, type GlobalSearchResult, type GlobalSearchResultType } from './search.types'

export type { GlobalSearchResult, GlobalSearchResultType }

export class GlobalSearchService {
  async search(query: string, access: GlobalSearchAccess, perGroupLimit = DEFAULT_PER_GROUP_LIMIT): Promise<GlobalSearchResult[]> {
    const searches: Array<Promise<GlobalSearchResult[]>> = []

    if (access.canSearchInternal) {
      searches.push(searchInternalRecords(query, access, perGroupLimit))
    }

    if (access.canSearchInternalDirectory) {
      searches.push(searchPeople(query, perGroupLimit))
    }

    if (access.canSearchClientOperations || access.clientOrganizationIds.length > 0) {
      searches.push(searchClientRecords(query, access, perGroupLimit))
    }

    if (access.canSearchPayroll) {
      searches.push(searchPayrollRecords(query, perGroupLimit))
    }

    const groups = await Promise.all(searches)
    return groups.flat()
  }
}
