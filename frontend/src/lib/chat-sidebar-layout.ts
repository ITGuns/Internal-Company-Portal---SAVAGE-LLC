const conversationActionButtonBase = [
    'absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md',
    'opacity-0 transition-colors group-hover:opacity-100 focus:opacity-100',
].join(' ')

const deleteButtonBase = [
    conversationActionButtonBase,
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40',
].join(' ')

const archiveButtonBase = [
    conversationActionButtonBase,
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50',
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

export function getChatSidebarArchiveButtonClass(isActive: boolean): string {
    if (isActive) {
        return [
            archiveButtonBase,
            'bg-[var(--accent-foreground)]/10 text-[var(--accent-foreground)]/80',
            'hover:bg-[var(--accent-foreground)]/15 hover:text-[var(--accent-foreground)] hover:opacity-100',
        ].join(' ')
    }

    return [
        archiveButtonBase,
        'bg-transparent text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]',
    ].join(' ')
}
