import React, { useEffect, useRef } from 'react';

/**
 * ResponsiveTable
 * ----------------
 * Drop-in wrapper for an existing <table>. Desktop/tablet (>640px) render
 * is untouched - the table keeps its real <table>/<thead>/<tbody> layout.
 * On phones (<=640px) the SAME table flips into a stack of cards via the
 * `.mobile-card-table` CSS (see src/index.css): one card per row, each
 * field shown as "Label: value".
 *
 * Instead of asking every page to restructure its table into a
 * columns/rows data shape (which would mean touching dozens of existing,
 * working tables and risking real logic changes), this wrapper copies
 * each <th> cell's text onto the matching <td> in every row as a
 * `data-label` attribute, at runtime, via a ref - so labels can never
 * drift out of sync with the header, and no page has to carry its own
 * copy of the column names.
 *
 * It also auto-detects which column is "primary" (first cell -> card
 * title) and which is the actions column (a cell whose only children are
 * buttons/links -> pinned action row at the bottom of the card).
 *
 * Usage: wrap the scrollable container (or the <table> itself) that a
 * page already renders:
 *
 *   <ResponsiveTable>
 *     <table className="w-full ...">
 *       <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
 *       <tbody>...</tbody>
 *     </table>
 *   </ResponsiveTable>
 *
 * A cell can opt out of auto-labelling with `data-label-skip`, or set its
 * own label with an explicit `data-label="..."` (both are respected and
 * never overwritten).
 */
export default function ResponsiveTable({ children, className = '' }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;

    const applyLabels = () => {
      const tables = root.querySelectorAll('table');
      tables.forEach((table) => {
        table.classList.add('mobile-card-table');

        const headerRow = table.querySelector('thead tr:last-of-type');
        const labels = headerRow
          ? Array.from(headerRow.children).map((cell) => cell.textContent.trim())
          : [];

        const rows = table.querySelectorAll('tbody > tr');
        rows.forEach((row) => {
          const cells = Array.from(row.children);

          // A single colSpan'd cell is a full-width status row (loading /
          // empty state), not real data - leave it as plain centered text,
          // never force a column label onto it.
          if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
            cells[0].classList.add('mobile-card-fullrow');
            return;
          }

          let firstContentIdx = -1;

          cells.forEach((cell, i) => {
            const isActionsCell =
              cell.children.length > 0 &&
              Array.from(cell.children).every(
                (child) =>
                  child.tagName === 'BUTTON' ||
                  child.tagName === 'A' ||
                  (child.getAttribute && child.getAttribute('role') === 'button')
              );

            if (isActionsCell) {
              cell.classList.add('mobile-card-actions');
              cell.removeAttribute('data-label');
              return;
            }

            if (!cell.hasAttribute('data-label') && !cell.hasAttribute('data-label-skip') && labels[i]) {
              cell.setAttribute('data-label', labels[i]);
            }

            if (firstContentIdx === -1) firstContentIdx = i;
          });

          // First non-actions cell becomes the card's title (no label
          // prefix, shown larger/bold - see .mobile-card-title in CSS).
          if (firstContentIdx !== -1) {
            cells[firstContentIdx].classList.add('mobile-card-title');
          }
        });
      });
    };

    applyLabels();

    // Re-run whenever the page re-renders new rows (filtering, pagination,
    // live data refresh) so labels/roles never go stale.
    const observer = new MutationObserver(applyLabels);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  return (
    <div ref={wrapRef} className={className}>
      {children}
    </div>
  );
}
