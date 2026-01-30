import React from 'react'
import { Settings, PlusCircle } from 'lucide-react'

type Props = {
  label?: string
  onClick?: () => void
}

export default function IconButton({ label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm btn-outline gap-2"
      aria-label={label ?? 'icon-button'}
    >
      <PlusCircle className="w-4 h-4" />
      {label ?? 'New'}
      <Settings className="w-4 h-4 opacity-50 ml-2" />
    </button>
  )
}
