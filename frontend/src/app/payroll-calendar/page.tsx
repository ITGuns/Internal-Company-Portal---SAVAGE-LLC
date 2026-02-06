"use client"

import React from 'react'
import Header from '@/components/Header'

export default function PayrollCalendarPage() {
  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Payroll Calendar" subtitle="View payroll runs, deadlines, and approvals." />

        <div className="mt-6 p-8">
          <h2 className="text-2xl font-semibold">Payroll Calendar (Placeholder)</h2>
          <p className="mt-4 text-[var(--muted)]">This is a placeholder page for Payroll Calendar.</p>
        </div>
      </div>
    </main>
  )
}
