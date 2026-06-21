"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from '../Button';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main heading text */
  title?: string;
  /** Description text */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** Secondary action button click handler */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'compact';
}

/**
 * Reusable empty state component
 * Replaces inconsistent empty state implementations across pages
 * 
 * @example
 * <EmptyState
 *   icon={FileText}
 *   title="No logs found"
 *   description="Get started by creating your first daily log"
 *   actionLabel="Create your first log"
 *   onAction={() => setShowModal(true)}
 * />
 */
export default function EmptyState({
  icon: Icon,
  title = 'No items found',
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`
        text-center
        ${isCompact 
          ? 'py-8 bg-transparent' 
          : 'py-12 bg-[var(--card-bg)] rounded-lg border border-[var(--border)]'
        }
        ${className}
      `}
    >
      {/* Icon */}
      {Icon && (
        <div className={`flex justify-center mb-4 ${isCompact ? 'opacity-50' : ''}`}>
          <Icon
            className={`text-[var(--muted)] ${isCompact ? 'w-8 h-8' : 'w-12 h-12'}`}
            strokeWidth={1.5}
          />
        </div>
      )}

      {/* Title */}
      <div
        className={`
          text-[var(--muted)] font-medium
          ${isCompact ? 'text-sm mb-1' : 'text-base mb-2'}
        `}
      >
        {title}
      </div>

      {/* Description */}
      {description && (
        <div
          className={`
            text-[var(--muted)] max-w-md mx-auto
            ${isCompact ? 'text-xs mb-3' : 'text-sm mb-4'}
          `}
        >
          {description}
        </div>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className={`flex items-center justify-center gap-3 ${isCompact ? 'mt-3' : 'mt-6'}`}>
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size={isCompact ? 'sm' : 'md'}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="secondary"
              size={isCompact ? 'sm' : 'md'}
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
