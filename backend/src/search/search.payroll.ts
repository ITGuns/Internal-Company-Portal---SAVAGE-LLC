import { prisma } from '../database/prisma.service'
import type { GlobalSearchResult } from './search.types'
import { compact, toDateLabel } from './search.utils'

export async function searchPayrollRecords(query: string, limit: number): Promise<GlobalSearchResult[]> {
  const [events, entries, payslips, profiles] = await Promise.all([
    prisma.payrollEvent.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { date: 'desc' },
      take: limit,
    }),
    prisma.timeEntry.findMany({
      where: {
        OR: [
          { notes: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { start: 'desc' },
      take: limit,
    }),
    prisma.payslip.findMany({
      where: {
        OR: [
          { id: { contains: query, mode: 'insensitive' } },
          { status: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
        period: { select: { startDate: true, endDate: true, status: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    }),
    prisma.employeeProfile.findMany({
      where: {
        OR: [
          { jobTitle: { contains: query, mode: 'insensitive' } },
          { employmentType: { contains: query, mode: 'insensitive' } },
          { requestedRole: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
  ])

  return [
    ...events.map((event): GlobalSearchResult => ({
      id: `payroll-event:${event.id}`,
      type: 'payroll-event',
      title: event.title,
      subtitle: compact([event.type, toDateLabel(event.date)]),
      href: '/payroll-calendar?tab=calendar',
      section: 'Payroll',
    })),
    ...entries.map((entry): GlobalSearchResult => ({
      id: `payroll-time:${entry.id}`,
      type: 'payroll-time',
      title: entry.notes || 'Time entry',
      subtitle: compact([entry.user.name || entry.user.email, toDateLabel(entry.start)]),
      href: `/payroll-calendar?tab=calendar&userId=${encodeURIComponent(entry.user.id)}`,
      section: 'Payroll',
    })),
    ...payslips.map((payslip): GlobalSearchResult => ({
      id: `payroll-payslip:${payslip.id}`,
      type: 'payroll-payslip',
      title: `Payslip ${payslip.id.slice(0, 8)}`,
      subtitle: compact([payslip.user.name || payslip.user.email, payslip.status, toDateLabel(payslip.period.endDate)]),
      href: '/payroll-calendar?tab=payslips',
      section: 'Payroll',
    })),
    ...profiles.map((profile): GlobalSearchResult => ({
      id: `payroll-profile:${profile.id}`,
      type: 'payroll-profile',
      title: profile.user.name || profile.user.email,
      subtitle: compact([profile.jobTitle, profile.employmentType, profile.requestedRole]),
      href: '/payroll-calendar?tab=employees',
      section: 'Payroll',
    })),
  ]
}
