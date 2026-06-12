export interface ChatMessageActionLayout {
    row: string
    cluster: string
    actionRail: string
    ownerActions: string
    reactionChips: string
    pickerPanel: string
}

const pickerPanelBase = 'absolute bottom-full z-30 mb-2 flex w-max max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card-surface)]/95 p-1 shadow-xl backdrop-blur-md'

export function getChatMessageActionLayout(isOwnMessage: boolean): ChatMessageActionLayout {
    return {
        row: `flex w-full items-end ${isOwnMessage ? 'justify-end' : 'justify-start'}`,
        cluster: 'flex max-w-[85%] items-end gap-2 md:max-w-[70%]',
        actionRail: `relative flex shrink-0 items-center self-end pb-0.5 ${isOwnMessage ? 'order-first justify-end' : 'order-last justify-start'}`,
        ownerActions: 'pointer-events-none absolute right-full mr-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        reactionChips: `mt-1 flex max-w-[85%] flex-wrap items-center gap-1 md:max-w-[70%] ${isOwnMessage ? 'justify-end pr-2' : 'pl-10'}`,
        pickerPanel: `${pickerPanelBase} ${isOwnMessage ? 'right-0' : 'left-0'}`,
    }
}
