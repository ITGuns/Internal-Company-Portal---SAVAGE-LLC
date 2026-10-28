import React from 'react';
import { getMemberInitials } from '@/lib/org-chart';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  person: { name: string | null; email: string; avatar: string | null };
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
};

/** Photo when the member has one, initials otherwise. Decorative: the name is always shown next to it. */
export default function MemberAvatar({ person, size = 'md', className }: MemberAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card-surface)] font-semibold text-[var(--accent)]',
        sizeClasses[size],
        className,
      )}
    >
      {person.avatar ? (
        <img src={person.avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        getMemberInitials(person)
      )}
    </span>
  );
}
