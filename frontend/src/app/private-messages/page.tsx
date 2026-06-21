import { redirect } from 'next/navigation'

export default function PrivateMessagesRedirect() {
    redirect('/chat')
}
