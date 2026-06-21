import { redirect } from 'next/navigation'

export default function TaskCalendarPage() {
  redirect('/task-tracking?view=calendar')
}
