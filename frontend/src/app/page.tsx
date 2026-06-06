import { redirect } from 'next/navigation'

export default function RootPage() {
  // Server-side redirect to the dashboard so visiting `/` doesn't 404
  redirect('/dashboard')
}
