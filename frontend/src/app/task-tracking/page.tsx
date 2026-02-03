"use client"

import React, { useState } from 'react'
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
  const [tasks, setTasks] = useState<Record<string, Task[]>>(sample)
  const [showModal, setShowModal] = useState(false)

  // new task form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [when, setWhen] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Med')

  function openNewTask() {
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setTitle('')
    setSubtitle('')
    setAssignee('')
    setWhen('')
    setPriority('Med')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const id = `n${Date.now()}`
    const newTask: Task = { id, title: title.trim(), subtitle: subtitle.trim() || undefined, assignee: assignee || undefined, when: when || undefined, priority }
    setTasks(prev => ({ ...prev, todo: [newTask, ...prev.todo] }))
    closeModal()
  }

  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Task Tracking" subtitle="Track and manage tasks, assignments, and progress." />

        <div className="mt-6">
          {/* top controls */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={openNewTask} className="px-3 py-2 rounded-md flex items-center gap-2" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
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
                    {tasks.todo.map(t => <BoardCard key={t.id} task={t} />)}
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
                    {tasks.inprogress.map(t => <BoardCard key={t.id} task={t} />)}
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
                    {tasks.review.map(t => <BoardCard key={t.id} task={t} />)}
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
                    {tasks.done.map(t => <BoardCard key={t.id} task={t} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="fixed z-50 flex items-start justify-center bg-gray-100/80 pt-20" style={{ top: 0, left: '16rem', right: 0, bottom: 0 }}>
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold mb-2">Create New Task</h3>
              <button onClick={closeModal} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Task Name</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" className="w-full p-3 rounded border border-[var(--border)] bg-[var(--background)]" required />
              </div>

              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Tell us more about this task..." className="w-full p-3 rounded border border-[var(--border)] bg-[var(--background)] h-28" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Department</label>
                  <select className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Engineering</option>
                    <option>HR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                    <option>Low</option>
                    <option>Med</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Assign To</label>
                  <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                    <option value="">Unassigned</option>
                    <option>John Smith</option>
                    <option>Emma Wilson</option>
                    <option>Michael Chen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Due Date</label>
                  <input type="date" value={when} onChange={e => setWhen(e.target.value)} className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]" />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Review</option>
                  <option>Completed</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-3 py-2 rounded bg-[var(--card-bg)] border border-[var(--border)]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-[var(--foreground)] text-[var(--background)]">Create New Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
