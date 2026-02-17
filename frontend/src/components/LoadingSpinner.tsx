import React from 'react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Spinning circle */}
        <div className="absolute inset-0 border-4 border-[var(--border)] rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-[var(--accent)] rounded-full animate-spin"></div>
      </div>
      {message && <p className="mt-4 text-[var(--muted)] text-sm">{message}</p>}
    </div>
  )
}
