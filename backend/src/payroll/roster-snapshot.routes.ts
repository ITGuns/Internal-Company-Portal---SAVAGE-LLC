import { Request, Response, Router } from 'express'
import { authenticateToken, requireRole } from '../auth/auth.middleware'
import { createLogger } from '../observability/logger'
import { PAYROLL_MANAGEMENT_ROUTE_ROLES } from './payroll.permissions'
import { PayrollOptionsService, payrollOptionsService } from './payroll-options.service'
import { buildRosterCsv, categoryLabelFor, parseRosterQuery, rosterCsvFilename, RosterTarget } from './roster-snapshot'
import { EmployeeHistoryReport, PeriodRosterReport, RosterSnapshotService, rosterSnapshotService } from './roster-snapshot.service'

const logger = createLogger('payroll.roster.routes')

const LOAD_FAILED = 'Failed to load the employee history'
const CSV_FAILED = 'Failed to build the employee history file'

export interface RosterRouteDeps {
    sendError: (res: Response, error: unknown, fallback: string) => unknown
    service?: RosterSnapshotService
    options?: Pick<PayrollOptionsService, 'listOptions'>
}

/**
 * Employee history (2026-10-28), registered on the /payroll router. Both
 * routes need a payroll-management role (401 without a token, 403 otherwise)
 * and take exactly one of ?periodId= (that period's roster) or ?userId= (one
 * person across periods). Contract: docs/api.md, "Employee history".
 */
export function registerRosterRoutes(router: Router, deps: RosterRouteDeps): Router {
    const service = deps.service || rosterSnapshotService
    const options = deps.options || payrollOptionsService
    const guard = requireRole([...PAYROLL_MANAGEMENT_ROUTE_ROLES])
    const load = (target: RosterTarget): Promise<PeriodRosterReport | EmployeeHistoryReport> => (
        'periodId' in target ? service.periodRoster(target.periodId) : service.employeeHistory(target.userId)
    )

    router.get('/reports/roster', authenticateToken, guard, async (req: Request, res: Response) => {
        try {
            const report = await load(parseRosterQuery(req.query))
            // Salaries and pay: never kept by a browser or proxy cache.
            res.set('Cache-Control', 'no-store')
            return res.json(report)
        } catch (error) {
            logger.error(LOAD_FAILED, error)
            return deps.sendError(res, error, LOAD_FAILED)
        }
    })

    router.get('/reports/roster.csv', authenticateToken, guard, async (req: Request, res: Response) => {
        try {
            const report = await load(parseRosterQuery(req.query))
            // Labels only: when the list cannot be read the CSV shows the stored values.
            const types = await options.listOptions('employment_type').catch(() => [])
            const csv = buildRosterCsv(report.rows, (value) => categoryLabelFor(types, value))
            const filename = 'period' in report
                ? rosterCsvFilename({ periodStart: report.period.startDay, periodEnd: report.period.endDay })
                : rosterCsvFilename({ employeeName: report.employee.name })
            res.set({
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            })
            return res.send(csv)
        } catch (error) {
            logger.error(CSV_FAILED, error)
            return deps.sendError(res, error, CSV_FAILED)
        }
    })

    return router
}
