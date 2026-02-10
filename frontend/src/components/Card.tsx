import React from 'react';

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
  default: 'rounded border border-[var(--border)] bg-[var(--card-bg)]',
  elevated: 'rounded shadow border border-[var(--border)] bg-[var(--card-bg)]',
  outlined: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)]',
  interactive: 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] hover:shadow-sm transition cursor-pointer'
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
  className = '', 
  padding = 'none',
  onClick 
}: CardProps) {
  const baseClasses = variantClasses[variant];
  const paddingClass = paddingClasses[padding];
  const combinedClasses = [baseClasses, paddingClass, className].filter(Boolean).join(' ');

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
function CardHeader({ children, className = '' }: CardSubComponentProps) {
  return (
    <div className={`px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

// Card.Content - For main card content area
function CardContent({ children, className = '' }: CardSubComponentProps) {
  return (
    <div className={`p-4 bg-[var(--card-surface)] ${className}`}>
      {children}
    </div>
  );
}

// Card.Footer - For card footers with actions or additional info
function CardFooter({ children, className = '' }: CardSubComponentProps) {
  return (
    <div className={`px-6 py-4 border-t border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

// Card.Body - Alternative to Content for cards without the surface background
function CardBody({ children, className = '' }: CardSubComponentProps) {
  return (
    <div className={`p-6 ${className}`}>
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
