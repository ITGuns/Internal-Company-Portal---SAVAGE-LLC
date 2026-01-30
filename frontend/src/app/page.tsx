import Image from "next/image";

import './globals.css'
import IconButton from '@/components/IconButton'

export const metadata = { title: 'Portal' }

export default function Page() {
  return (
    <main className="min-h-screen bg-base-100">
      <div className="container mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Internal Portal — Prototype</h1>
          <div className="flex gap-2">
            <IconButton label="Add Task" />
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-base-200 p-4">
            <h3 className="font-medium">To Do</h3>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-white rounded shadow">Task A</div>
              <div className="p-3 bg-white rounded shadow">Task B</div>
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h3 className="font-medium">In Progress</h3>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-white rounded shadow">Task C</div>
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h3 className="font-medium">Review</h3>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-white rounded shadow">Task D</div>
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h3 className="font-medium">Completed</h3>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-white rounded shadow">Task E</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
