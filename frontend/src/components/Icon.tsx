import React from 'react'

type IconProps = {
  component: React.ComponentType<{ className?: string; size?: number | string; 'aria-hidden'?: boolean }>
  size?: number | string
  className?: string
  /** If true, the icon is decorative and hidden from assistive tech */
  decorative?: boolean
}

export default function Icon({ component: Component, size = 16, className, decorative = true }: IconProps) {
  return <Component className={className} size={size} aria-hidden={decorative} />
}
