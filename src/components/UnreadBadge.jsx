import React from 'react';

// Small red WhatsApp-style counter for the corner of the message icon. Renders nothing when count is 0.
export default function UnreadBadge({ count }) {
    if (!count || count < 1) return null;
    return (
        <span
            data-testid="unread-badge"
            aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] leading-4 font-black text-center shadow pointer-events-none"
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}