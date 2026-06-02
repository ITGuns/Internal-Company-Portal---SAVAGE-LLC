import React from 'react'
import Header from '@/components/Header'

export default function TaskCalendarPage() {
  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header title="Task Calendar" subtitle="Task schedule and due dates" />
        <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card-surface)] p-6">
          <h2 className="text-lg font-semibold">Task Calendar</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Calendar-specific task scheduling will appear here.</p>
        </section>
      </div>
    </main>
  )
}
