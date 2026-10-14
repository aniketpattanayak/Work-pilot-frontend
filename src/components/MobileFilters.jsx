import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

/**
 * MobileFilters
 * -------------
 * Shared collapsed-by-default filter bar for phones. Desktop (md:+) is
 * untouched - render the page's existing filter controls as `children`
 * and `desktopChildren` (or just `children` if there's nothing to
 * duplicate) renders as before at md:+ widths via the `md:flex`
 * wrapper below.
 *
 * Usage:
 *   <MobileFilters activeCount={activeFilterCount} onClear={clearAll}>
 *     ...existing filter inputs/selects/date-pickers as children...
 *   </MobileFilters>
 *
 * - A search input that should stay visible even when collapsed can be
 *   passed as `alwaysVisible`.
 * - On phones: renders one "Filters" button (badge = activeCount) that
 *   expands a stacked panel with all the filter controls plus a Clear
 *   action. Collapsed by default.
 * - On md:+ screens: renders the filters inline, exactly as every page
 *   already had them (no visual change at all above the phone
 *   breakpoint).
 */
export default function MobileFilters({ children, alwaysVisible = null, activeCount = 0, onClear, className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop/tablet: filters render inline exactly as before. */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {alwaysVisible}
        {children}
      </div>

      {/* Phone: collapsed behind one Filters button. */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {alwaysVisible && <div className="flex-1 min-w-0">{alwaysVisible}</div>}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="btn-fit relative flex items-center gap-2 px-4 min-h-[44px] rounded-xl border border-border bg-card font-bold text-xs uppercase tracking-wide shrink-0"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-black">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {open && (
          <div className="mobile-filters-panel p-4 rounded-2xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">Filters</span>
              <div className="flex items-center gap-3">
                {activeCount > 0 && onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-xs font-bold uppercase tracking-wide text-primary"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="p-1.5 rounded-lg hover:bg-muted/50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
