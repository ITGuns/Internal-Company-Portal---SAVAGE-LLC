import Header from '@/components/Header'

export const metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-base-100">
      <div className="p-6">
        <Header />

        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Profile (Placeholder)</h1>
          <p className="text-muted">This is a placeholder page for the user profile.</p>
        </div>
      </div>
    </main>
  )
}
