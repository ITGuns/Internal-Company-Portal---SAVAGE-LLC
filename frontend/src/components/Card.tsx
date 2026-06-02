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
  default: 'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out)]',
  elevated: 'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-md)] transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out)]',
  outlined: 'rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent transition-[background-color,border-color] duration-150 ease-[var(--ease-out)]',
  interactive: 'cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-md)] active:translate-y-px active:scale-[0.995]'
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
    <div className={cn('flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4', className)}>
      {children}
    </div>
  );
}

// Card.Content - For main card content area
function CardContent({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('bg-[var(--card-bg)] p-4', className)}>
      {children}
    </div>
  );
}

// Card.Footer - For card footers with actions or additional info
function CardFooter({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('border-t border-[var(--border)] px-5 py-4', className)}>
      {children}
    </div>
  );
}

// Card.Body - Alternative to Content for cards without the surface background
function CardBody({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('p-5', className)}>
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
