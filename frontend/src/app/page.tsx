import Image from "next/image";

import './globals.css'
import IconButton from '@/components/IconButton'
import IconDemo from '@/components/IconDemo'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export const metadata = { title: 'Portal' }

export default function Page() {
  return (
    <main className="min-h-screen bg-base-100">
      <Sidebar />

      <div className="ml-64 p-6">
        <Header />

        <div className="space-y-4">
          <main className="space-y-4">
            <div className="mb-6">
              <IconDemo />
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </section>
          </main>
        </div>
      </div>
    </main>
  )
}
