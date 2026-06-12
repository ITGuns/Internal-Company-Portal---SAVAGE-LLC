const deleteButtonBase = [
    'absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md',
    'opacity-0 transition-colors group-hover:opacity-100 focus:opacity-100',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40',
].join(' ')

export function getChatSidebarDeleteButtonClass(isActive: boolean): string {
    if (isActive) {
        return [
            deleteButtonBase,
            'bg-[var(--accent-foreground)]/10 text-[var(--accent-foreground)]/70',
            'hover:bg-red-500/15 hover:text-red-800 hover:opacity-100',
        ].join(' ')
    }

    return [
        deleteButtonBase,
        'bg-transparent text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400',
    ].join(' ')
}
