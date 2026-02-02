import React from 'react'
import BrandLogo from '../assets/icons/BrandLogo'
import IconButton from './IconButton'
import ThemeToggle from './ThemeToggle'
import UserAvatar from '../assets/icons/UserAvatar'
import { Bell, Search } from 'lucide-react'

export default function Header() {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <BrandLogo width={28} height={28} ariaHidden={true} />
        <h1 className="text-2xl font-semibold">SAVAGE - LLC ENTERPRISES</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-base-200 rounded p-2 gap-2">
          <Search className="w-4 h-4 opacity-60" />
          <input aria-label="Search" className="bg-transparent outline-none" placeholder="Search..." />
        </div>

        <IconButton label="Add Task" />
        <ThemeToggle />

        <button aria-label="notifications" className="btn btn-ghost btn-circle">
          <Bell className="w-5 h-5" />
        </button>

        <UserAvatar className="w-8 h-8 rounded-full" size={32} ariaHidden={true} />
      </div>
    </header>
  )
}
