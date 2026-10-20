import React from 'react';

/**
 * One field slot of a designable form. It puts the field in the order the company chose,
 * hides it when the company switched it off, and gives it half or full width.
 * The parent must be <div className={FIELD_GRID}> holding only FormField children.
 */
export const FIELD_GRID = 'flex flex-wrap gap-x-5 gap-y-5';
export const HALF = 'w-full md:w-[calc(50%-0.625rem)]';

export default function FormField({ L, id, full = false, className = '', children }) {
  if (L && L.hidden(id)) return null;
  return <div style={L ? L.style(id) : undefined} className={`${full ? 'w-full' : HALF} min-w-0 ${className}`}>{children}</div>;
}
