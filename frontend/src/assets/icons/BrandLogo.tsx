import React from 'react'

type Props = { className?: string; width?: number | string; height?: number | string; ariaHidden?: boolean }

export default function BrandLogo({ className, width = 28, height = 28, ariaHidden = true }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? 'img' : undefined}
    >
      <rect width="20" height="20" x="2" y="2" fill="#111827" rx="4" />
      <path fill="#fff" d="M6 8h12v2H6zm0 4h12v2H6z" opacity=".95" />
    </svg>
  )
}
