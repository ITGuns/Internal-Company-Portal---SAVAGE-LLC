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
      onClick={onClick}
      className="btn btn-sm btn-outline gap-2"
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
