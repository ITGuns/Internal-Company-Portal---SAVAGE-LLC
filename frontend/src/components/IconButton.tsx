import React from 'react'
import { Settings, PlusCircle } from 'lucide-react'

type IconType = React.ComponentType<{ className?: string }>

type Props = {
  label?: string
  onClick?: () => void
  /** Primary icon to render on the left (can be from an icon lib or local component) */
  icon?: IconType
  /** Optional icon to render on the right */
  endIcon?: IconType
}

export default function IconButton({
  label,
  onClick,
  icon: Icon,
  endIcon: EndIcon,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--foreground)] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)] active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      aria-label={label ?? 'icon-button'}
    >
      {Icon ? (
        <Icon className="w-4 h-4" />
      ) : (
        <PlusCircle className="w-4 h-4" />
      )}

      <span>{label ?? 'New'}</span>

      {EndIcon ? (
        <EndIcon className="w-4 h-4 opacity-50 ml-2" />
      ) : (
        <Settings className="w-4 h-4 opacity-50 ml-2" />
      )}
    </button>
  )
}
