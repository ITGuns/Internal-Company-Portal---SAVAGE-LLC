"use client"

import React, { useState } from 'react'
import Header from '@/components/Header'
import { Filter, SortAsc, Users, List, Grid, Calendar, Plus, MoreHorizontal } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

type Task = {
  id: string
  title: string
  subtitle?: string
  assignee?: string
  when?: string
  priority?: 'Low' | 'Med' | 'High'
  department?: string
  role?: string
}
const sample: Record<string, Task[]> = {
  todo: [
    { id: 't1', title: 'Update employee handbook', subtitle: 'Review and update company policies section', assignee: 'HR', when: '2026-01-30', priority: 'High' },
    { id: 't2', title: 'Q1 Marketing campaign planning', subtitle: 'Define strategy and budget allocation', assignee: 'Marketing', when: '2026-02-05', priority: 'Med' },
    { id: 't3', title: 'Server maintenance schedule', subtitle: 'Plan quarterly maintenance window', assignee: 'Engineering', when: '2026-01-28', priority: 'Low' },
  ],
  inprogress: [
    { id: 'p1', title: 'Sales pipeline review', subtitle: 'Weekly review of active opportunities', assignee: 'Sales', when: new Date().toISOString().slice(0,10), priority: 'High' },
    { id: 'p2', title: 'API documentation update', subtitle: 'Update v2.0 endpoints documentation', assignee: 'Engineering', when: '2026-01-29', priority: 'Med' },
    { id: 'p3', title: 'Budget reconciliation', subtitle: 'Q4 2024 final reconciliation', assignee: 'Finance', when: '2026-02-01', priority: 'High' },
  ],
  review: [
    { id: 'r1', title: 'New hire onboarding process', subtitle: 'Review feedback from recent hires', assignee: 'HR', when: '2026-01-27', priority: 'Med' },
    { id: 'r2', title: 'Social media content calendar', subtitle: 'February content approval needed', assignee: 'Marketing', when: '2026-01-26', priority: 'Low' },
  ],
  done: [
    { id: 'd1', title: 'Deploy v1.5 to prod', subtitle: 'Successfully deployed to production', assignee: 'Engineering', when: '2026-01-20', priority: 'Low' },
  ],
}

function BoardCard({ task }: { task: Task }) {
  return (
    <div className="p-3 mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">{task.title}</div>
          {task.subtitle ? <div className="text-xs text-[var(--muted)] mt-1">{task.subtitle}</div> : null}
          {(task.department || task.role) ? (
            <div className="text-xs text-[var(--muted)] mt-1">{[task.department, task.role].filter(Boolean).join(' — ')}</div>
          ) : null}
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
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('calendar')

  // form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [when, setWhen] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Med')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')

  const departmentRoles: Record<string, string[]> = {
    'Owners / Founders': [],
    'Project Managers': ['Project Manager', 'Operations Manager'],
    'Website Developers': ['Frontend Developer', 'Backend / Technical Developer'],
    'Payroll / Finance': ['Bookkeeping', 'Contractor & Salary Payments'],
    'Operations': ['Fulfillment / Logistics VA', 'Inventory VA', 'Customer Experience (CX) VA'],
    'Digital Marketing': ['Digital Marketing Lead / Marketing VA', 'Media Buyer / Ads Specialist', 'Content Creator / Designer', 'Email & SMS Marketer', 'Influencer / Social Media VA'],
    'Analytics / Data': ['Analytics / Data VA'],
    'Automation / Tech': ['Automation / Tech VA'],
  }

  function openNewTask() { setShowModal(true) }
  function closeModal() {
    setShowModal(false)
    setTitle('')
    setSubtitle('')
    setAssignee('')
    setWhen('')
    setPriority('Med')
    setDepartment('')
    setRole('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const id = `n${Date.now()}`
    const newTask: Task = { id, title: title.trim(), subtitle: subtitle.trim() || undefined, assignee: assignee || undefined, when: when || undefined, priority, department: department || undefined, role: role || undefined }
    setTasks(prev => ({ ...prev, todo: [newTask, ...(prev.todo || [])] }))
    closeModal()
  }

  const allTasks = [
    ...tasks.todo.map(t => ({ ...t, status: 'To Do' })),
    ...tasks.inprogress.map(t => ({ ...t, status: 'In Progress' })),
    ...tasks.review.map(t => ({ ...t, status: 'Review' })),
    ...tasks.done.map(t => ({ ...t, status: 'Completed' })),
  ]

  const events = allTasks
    .map(t => {
      const date = t.when && !isNaN(Date.parse(t.when)) ? new Date(t.when) : null
      if (!date) return null
      return { id: t.id, title: t.title, start: date.toISOString().slice(0,10), extendedProps: { assignee: t.assignee, priority: t.priority, department: t.department, role: t.role, status: (t as any).status } }
    })
    .filter(Boolean) as any[]

  const todayStr = new Date().toISOString().slice(0,10)
  const todays = allTasks.filter(t => t.when === todayStr)
  const overdue = allTasks.filter(t => t.when && !isNaN(Date.parse(t.when)) && t.when < todayStr)
  const total = allTasks.length
  const completed = allTasks.filter(t => t.priority === 'Low' && t.when && t.when < todayStr).length
  const inprogress = allTasks.filter(t => (t as any).status === 'In Progress').length

  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Task Tracking" subtitle="Track and manage tasks, assignments, and progress." />

        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={openNewTask} className="px-3 py-2 rounded-md flex items-center gap-2" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
              <Plus className="w-4 h-4" /> New Task
            </button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><SortAsc className="w-4 h-4" /> Sort</button>
            <button className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded flex items-center gap-2"><Users className="w-4 h-4" /> Group by</button>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setView('list')} aria-pressed={view === 'list'} className={`px-2 py-2 border rounded ${view === 'list' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-[var(--card-bg)]'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setView('grid')} aria-pressed={view === 'grid'} className={`px-2 py-2 border rounded ${view === 'grid' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-[var(--card-bg)]'}`}><Grid className="w-4 h-4" /></button>
              <button onClick={() => setView('calendar')} aria-pressed={view === 'calendar'} className={`px-2 py-2 border rounded ${view === 'calendar' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-[var(--card-bg)]'}`}><Calendar className="w-4 h-4" /></button>
            </div>
          </div>

          {view === 'grid' ? (
            <div className="overflow-x-auto pb-6">
              <div className="flex gap-4 min-w-[1100px]">
                <div className="w-100">
                  <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                      <div className="text-sm font-semibold">To Do <span className="text-xs text-[var(--muted)]">{tasks.todo.length}</span></div>
                      <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                    </div>
                    <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">{tasks.todo.map(t => <BoardCard key={t.id} task={t} />)}</div>
                  </div>
                </div>

                <div className="w-100">
                  <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                      <div className="text-sm font-semibold">In Progress <span className="text-xs text-[var(--muted)]">{tasks.inprogress.length}</span></div>
                      <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                    </div>
                    <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">{tasks.inprogress.map(t => <BoardCard key={t.id} task={t} />)}</div>
                  </div>
                </div>

                <div className="w-100">
                  <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                      <div className="text-sm font-semibold">Review <span className="text-xs text-[var(--muted)]">{tasks.review.length}</span></div>
                      <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                    </div>
                    <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">{tasks.review.map(t => <BoardCard key={t.id} task={t} />)}</div>
                  </div>
                </div>

                <div className="w-100">
                  <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                      <div className="text-sm font-semibold">Completed <span className="text-xs text-[var(--muted)]">{tasks.done.length}</span></div>
                      <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                    </div>
                    <div className="p-3 bg-[var(--card-surface)] min-h-[320px]">{tasks.done.map(t => <BoardCard key={t.id} task={t} />)}</div>
                  </div>
                </div>
              </div>
            </div>

          ) : view === 'list' ? (
            <div className="pb-6">
              <div className="space-y-3">
                {(
                  [
                    ...tasks.todo.map(t => ({ ...t, status: 'To Do' })),
                    ...tasks.inprogress.map(t => ({ ...t, status: 'In Progress' })),
                    ...tasks.review.map(t => ({ ...t, status: 'Review' })),
                    ...tasks.done.map(t => ({ ...t, status: 'Completed' })),
                  ]
                ).map((t: any) => (
                  <div key={t.id} className="p-3 bg-[var(--card-surface)] border border-[var(--border)] rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{t.title}</div>
                      {t.subtitle ? <div className="text-xs text-[var(--muted)] mt-1">{t.subtitle}</div> : null}
                      {(t.department || t.role) ? <div className="text-xs text-[var(--muted)] mt-1">{[t.department, t.role].filter(Boolean).join(' — ')}</div> : null}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                      <div className="px-2 py-1 bg-[var(--card-bg)] rounded text-[var(--muted)]">{t.status}</div>
                      <div className="text-xs">{t.assignee}</div>
                      <div className="text-xs">{t.when}</div>
                      <div className="text-xs">{t.priority}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <div className="pb-6">
              <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay' }}
                  events={events}
                  eventContent={(arg) => {
                    const evt: any = arg.event
                    const ext = evt.extendedProps || {}
                    return (
                      <div className="p-2 bg-[var(--card-surface)] rounded border border-[var(--border)] shadow-sm text-[var(--foreground)]">
                        <div className="text-sm font-medium leading-tight">{evt.title}</div>
                        {(ext.assignee || ext.priority) ? (
                          <div className="text-xs text-[var(--muted)] mt-1">{ext.assignee ? ext.assignee : ''}{ext.assignee && ext.priority ? ' • ' : ''}{ext.priority ? ext.priority : ''}</div>
                        ) : null}
                      </div>
                    )
                  }}
                  height={600}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today's Tasks card */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden shadow-sm">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">Today's Tasks</div>
                    <div className="text-xs text-[var(--muted)]">{todays.length}</div>
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[160px]">
                    <ul className="space-y-2">
                      {todays.length ? todays.map(t => (
                        <li key={t.id} className="p-2 bg-[var(--card-bg)] border border-[var(--border)] rounded">
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-[var(--muted)]">{t.department || t.role}</div>
                        </li>
                      )) : (
                        <div className="text-xs text-[var(--muted)]">No tasks for today</div>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Overdue Tasks card */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden shadow-sm">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">Overdue Tasks</div>
                    <div className="text-xs text-[var(--muted)]">{overdue.length}</div>
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[160px]">
                    <ul className="space-y-3">
                      {overdue.length ? overdue.slice(0,3).map(t => (
                        <li key={t.id} className="p-2 bg-[var(--card-bg)] border border-[var(--border)] rounded">
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-[var(--muted)]">Due: {t.when}</div>
                        </li>
                      )) : (
                        <div className="text-xs text-[var(--muted)]">No overdue tasks</div>
                      )}
                    </ul>
                  </div>
                </div>

                {/* This Week summary card */}
                <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] overflow-hidden shadow-sm">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-sm font-semibold">This Week</div>
                    <div className="text-xs text-[var(--muted)]">Summary</div>
                  </div>
                  <div className="p-3 bg-[var(--card-surface)] min-h-[160px] text-sm text-[var(--muted)]">
                    <div>Total Tasks: {total}</div>
                    <div>Completed: {completed}</div>
                    <div>In Progress: {inprogress}</div>
                    <div>Overdue: {overdue.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-50 flex items-start justify-center bg-gray-100/80 pt-20" style={{ top: 0, left: 'var(--sidebar-width, 16rem)', right: 0, bottom: 0 }}>
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
                  <select value={department} onChange={e => { setDepartment(e.target.value); setRole(''); }} className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                    <option value="">Select department</option>
                    {Object.keys(departmentRoles).map(d => <option key={d} value={d}>{d}</option>)}
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

              <div>
                <label className="block text-sm mb-1">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} disabled={!department} className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)]">
                  <option value="">Select role</option>
                  {(department && departmentRoles[department] ? departmentRoles[department] : []).map(r => <option key={r} value={r}>{r}</option>)}
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
