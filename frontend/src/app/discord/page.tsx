import React from 'react'
import Header from '@/components/Header'

export default function DiscordPage() {
  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header title="Discord" subtitle="External team channel" />
        <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card-surface)] p-6">
          <h2 className="text-lg font-semibold">Discord</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Use the dashboard quick link to open the team Discord workspace.</p>
        </section>
      </div>
    </main>
  )
}
