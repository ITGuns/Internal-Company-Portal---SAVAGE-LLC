import React from 'react'
import Header from '@/components/Header'
import { Filter, SortAsc, Users, List, Grid, Calendar, Plus, MoreHorizontal } from 'lucide-react'

type Task = {
  id: string
  title: string
  subtitle?: string
  assignee?: string
  when?: string
  priority?: 'Low' | 'Med' | 'High'
}

const sample: Record<string, Task[]> = {
  todo: [
    { id: 't1', title: 'Update employee handbook', subtitle: 'Review and update company policies section', assignee: 'HR', when: 'Jan 30', priority: 'High' },
    { id: 't2', title: 'Q1 Marketing campaign planning', subtitle: 'Define strategy and budget allocation', assignee: 'Marketing', when: 'Feb 5', priority: 'Med' },
    { id: 't3', title: 'Server maintenance schedule', subtitle: 'Plan quarterly maintenance window', assignee: 'Engineering', when: 'Jan 28', priority: 'Low' },
  ],
  inprogress: [
    { id: 'p1', title: 'Sales pipeline review', subtitle: 'Weekly review of active opportunities', assignee: 'Sales', when: 'Today', priority: 'High' },
    { id: 'p2', title: 'API documentation update', subtitle: 'Update v2.0 endpoints documentation', assignee: 'Engineering', when: 'Jan 29', priority: 'Med' },
    { id: 'p3', title: 'Budget reconciliation', subtitle: 'Q4 2024 final reconciliation', assignee: 'Finance', when: 'Feb 1', priority: 'High' },
  ],
  review: [
    { id: 'r1', title: 'New hire onboarding process', subtitle: 'Review feedback from recent hires', assignee: 'HR', when: 'Jan 27', priority: 'Med' },
    { id: 'r2', title: 'Social media content calendar', subtitle: 'February content approval needed', assignee: 'Marketing', when: 'Jan 26', priority: 'Low' },
  ],
  done: [
    { id: 'd1', title: 'Deploy v1.5 to prod', subtitle: 'Successfully deployed to production', assignee: 'Engineering', when: 'Jan 20', priority: 'Low' },
  ],
}

function BoardCard({ task }: { task: Task }) {
  return (
    <div className="p-3 mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">{task.title}</div>
          {task.subtitle ? <div className="text-xs text-[var(--muted)] mt-1">{task.subtitle}</div> : null}
        </div>
        <div className="text-xs text-[var(--muted)] ml-2">{task.priority}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--card-surface)] flex items-center justify-center text-[var(--muted)]">{task.assignee?.charAt(0)}</div>
          <div>{task.assignee}</div>
        </div>
        <div>{task.when}</div>
      </div>
    </div>
  )
}

export default function TaskTrackingPage() {
  return (
    <main style={{ minHeight: 'calc(100vh - 9rem)' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Task Tracking" subtitle="Track and manage tasks, assignments, and progress." />

        <div className="mt-6">
          {/* top controls */}
          <div className="flex items-center gap-3 mb-4">
            <button className="px-3 py-2 rounded-md flex items-center gap-2" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
              <Plus className="w-4 h-4" />
              New Task
            </button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><SortAsc className="w-4 h-4" /> Sort</button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><Users className="w-4 h-4" /> Group by</button>

            <div className="ml-auto flex items-center gap-2">
              <button className="px-2 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded"><List className="w-4 h-4" /></button>
              <button className="px-2 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded"><Grid className="w-4 h-4" /></button>
              <button className="px-2 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded"><Calendar className="w-4 h-4" /></button>
            </div>
          </div>

          {/* board */}
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-4 min-w-[1100px]">
              {/* column */}
              <div className="w-100">
                <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">To Do <span className="text-xs text-[var(--muted)]">8</span></div>
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">
                    {sample.todo.map(t => <BoardCard key={t.id} task={t} />)}
                    <div className="text-center text-sm text-[var(--muted)] mt-2">+ Add task</div>
                  </div>
                </div>
              </div>

              <div className="w-100">
                <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">In Progress <span className="text-xs text-[var(--muted)]">5</span></div>
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">
                    {sample.inprogress.map(t => <BoardCard key={t.id} task={t} />)}
                    <div className="text-center text-sm text-[var(--muted)] mt-2">+ Add task</div>
                  </div>
                </div>
              </div>

              <div className="w-100">
                <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">Review <span className="text-xs text-[var(--muted)]">3</span></div>
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">
                    {sample.review.map(t => <BoardCard key={t.id} task={t} />)}
                    <div className="text-center text-sm text-[var(--muted)] mt-2">+ Add task</div>
                  </div>
                </div>
              </div>

              <div className="w-100">
                <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">Completed <span className="text-xs text-[var(--muted)]">2</span></div>
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">
                    {sample.done.map(t => <BoardCard key={t.id} task={t} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
