import { redirect } from 'next/navigation'

/**
 * /payroll-dashboard is an alias — redirect to the full Payroll Calendar page.
 */
export default function PayrollDashboardPage() {
    redirect('/payroll-calendar')
}
