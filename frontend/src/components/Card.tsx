import React from 'react';
import { cn } from '@/lib/utils';

// Card variants
type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

interface CardSubComponentProps {
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] transition-shadow duration-200',
  elevated: 'rounded-lg shadow-sm border border-[var(--border)] bg-[var(--card-bg)] transition-all duration-200 hover:shadow-md',
  outlined: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] transition-all duration-200',
  interactive: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--muted)] cursor-pointer'
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export function Card({ 
  children, 
  variant = 'default', 
  className, 
  padding = 'none',
  onClick 
}: CardProps) {
  const combinedClasses = cn(variantClasses[variant], paddingClasses[padding], className);

  if (onClick) {
    return (
      <div 
        className={combinedClasses}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
}

// Card.Header - For card headers with title and actions
function CardHeader({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]', className)}>
      {children}
    </div>
  );
}

// Card.Content - For main card content area
function CardContent({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('p-4 bg-[var(--card-surface)]', className)}>
      {children}
    </div>
  );
}

// Card.Footer - For card footers with actions or additional info
function CardFooter({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-[var(--border)]', className)}>
      {children}
    </div>
  );
}

// Card.Body - Alternative to Content for cards without the surface background
function CardBody({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

// Attach subcomponents to Card
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Body = CardBody;

export default Card;
