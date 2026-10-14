import React, { useEffect, useRef } from 'react';

/**
 * ResponsiveGrid
 * --------------
 * Same idea as ResponsiveTable, for the handful of pages that build
 * their own Excel-style grid out of CSS Grid `<div>`s instead of a real
 * `<table>` (ManageTasks' task list, ChecklistMonitor's grid). Desktop/
 * tablet keep the exact same grid layout; on phones, the header row
 * (`.mobile-grid-head`) hides and each data row (`.mobile-grid-row`)
 * becomes a card, with every cell's text copied from the matching
 * header cell as a `data-label`, read at runtime so it can never drift
 * out of sync with the column - mirrors ResponsiveTable's
 * data-label-from-live-header mechanism exactly, just keyed by DOM
 * position (nth child) instead of <th>/<td>.
 *
 * Usage: wrap the common ancestor of one `.mobile-grid-head` row and
 * any number of `.mobile-grid-row` rows (same grid-template-columns on
 * all of them, so column N lines up everywhere):
 *
 *   <ResponsiveGrid>
 *     <div className="mobile-grid-head grid grid-cols-[...]">...labels...</div>
 *     {rows.map(r => <div className="mobile-grid-row grid grid-cols-[...]">...cells...</div>)}
 *   </ResponsiveGrid>
 *
 * A cell opts out of auto-labelling with `data-label-skip`, or sets its
 * own with `data-label="..."`.
 */
export default function ResponsiveGrid({ children, className = '' }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;

    const applyLabels = () => {
      const head = root.querySelector('.mobile-grid-head');
      const labels = head ? Array.from(head.children).map((c) => c.textContent.trim()) : [];

      const rows = root.querySelectorAll('.mobile-grid-row');
      rows.forEach((row) => {
        const cells = Array.from(row.children);
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
            cell.classList.add('mobile-grid-actions');
            cell.removeAttribute('data-label');
            return;
          }

          if (!cell.hasAttribute('data-label') && !cell.hasAttribute('data-label-skip') && labels[i]) {
            cell.setAttribute('data-label', labels[i]);
          }
          if (firstContentIdx === -1) firstContentIdx = i;
        });

        if (firstContentIdx !== -1) cells[firstContentIdx].classList.add('mobile-grid-title');
      });
    };

    applyLabels();
    const observer = new MutationObserver(applyLabels);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  return (
    <div ref={wrapRef} className={`mobile-grid-wrap ${className}`}>
      {children}
    </div>
  );
}
