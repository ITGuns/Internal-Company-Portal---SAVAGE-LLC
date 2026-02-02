import React from 'react'

type Props = { className?: string; size?: number | string; ariaHidden?: boolean }

export default function UserAvatar({ className, size = 32, ariaHidden = true }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden={ariaHidden}
    >
      <circle cx="16" cy="12" r="6" fill="#F3F4F6" />
      <path fill="#E5E7EB" d="M4 28c0-6.627 5.373-12 12-12s12 5.373 12 12" />
    </svg>
  )
}
