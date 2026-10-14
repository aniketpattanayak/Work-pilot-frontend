// Runs inside the page (via page.evaluate). Returns one result object
// per check (a)-(h) for the current viewport. Kept dependency-free and
// self-contained since it crosses the Node/browser boundary as a string.
function runChecks(isPhoneWidth) {
  const results = {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viol = (arr) => arr.slice(0, 12); // cap detail length per check

  // An element that is entirely off-canvas (e.g. the desktop sidebar
  // drawer sitting at translateX(-100%) while closed on phones) still
  // reports a real getBoundingClientRect - transforms move the box, they
  // don't zero it out. Checks that only make sense for what the user can
  // actually see should skip anything with no on-screen intersection at
  // all, rather than flag a deliberately hidden off-screen panel as
  // "overflowing".
  const isOnScreen = (r) => r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh;

  // (a) no horizontal scroll on the page itself
  const scrollWidth = document.documentElement.scrollWidth;
  results.a_no_horizontal_scroll = {
    pass: scrollWidth <= vw + 1,
    detail: `scrollWidth=${scrollWidth} viewport=${vw}`,
  };

  // (b) no element's box extends past the viewport (fixed overlays that
  // fit are fine by construction - we only flag ones that genuinely
  // stick out).
  const overflowing = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (!isOnScreen(r)) return; // off-canvas (e.g. a closed drawer) - not a visible overflow
    if (r.right > vw + 2 || r.left < -2) {
      overflowing.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).toString().split(' ').slice(0, 2).join('.') : ''} right=${Math.round(r.right)}`);
    }
  });
  results.b_no_element_overflow = { pass: overflowing.length === 0, detail: viol(overflowing) };

  // (c) clipped text (scrollWidth > clientWidth, overflow hidden/clip, no ellipsis)
  const clipped = [];
  document.querySelectorAll('button, a, span, div, td, h1, h2, h3, p, label').forEach((el) => {
    if (el.children.length > 0) return; // leaf text nodes only
    const text = (el.textContent || '').trim();
    if (!text) return;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis') return; // intentional truncation, fine
    if (cs.overflow !== 'hidden' && cs.overflowX !== 'hidden' && cs.overflow !== 'clip') return;
    const r = el.getBoundingClientRect();
    if (!isOnScreen(r)) return; // not visible right now (e.g. inside a closed drawer)
    if (el.scrollWidth > el.clientWidth + 2) {
      clipped.push(`${el.tagName.toLowerCase()} "${text.slice(0, 30)}"`);
    }
  });
  results.c_no_clipped_text = { pass: clipped.length === 0, detail: viol(clipped) };

  // (d) every table in card mode on phones (thead hidden); every visible
  // cell carries a label unless it's the title/actions cell.
  const badTables = [];
  if (isPhoneWidth) {
    document.querySelectorAll('table.mobile-card-table').forEach((t, i) => {
      const thead = t.querySelector('thead');
      if (thead && getComputedStyle(thead).display !== 'none') {
        badTables.push(`table#${i} thead still visible (grid mode, not cards)`);
        return;
      }
      const unlabeled = [];
      t.querySelectorAll('tbody > tr > td').forEach((td) => {
        const isOk =
          td.hasAttribute('data-label') ||
          td.hasAttribute('data-label-skip') ||
          td.classList.contains('mobile-card-title') ||
          td.classList.contains('mobile-card-actions') ||
          td.classList.contains('mobile-card-fullrow') ||
          td.hasAttribute('colspan');
        if (!isOk && td.textContent.trim()) unlabeled.push(td.textContent.trim().slice(0, 20));
      });
      if (unlabeled.length) badTables.push(`table#${i}: ${unlabeled.length} unlabeled cell(s), e.g. "${unlabeled[0]}"`);
    });
  }
  results.d_tables_are_cards = { pass: badTables.length === 0, detail: viol(badTables) };

  // (e) tap targets >= 44px for interactive controls
  const smallTargets = [];
  document.querySelectorAll('button, a[href], input, select, [role="button"]').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (el.closest('.tap-target-auto')) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (!isOnScreen(r)) return; // not visible right now (e.g. inside a closed drawer)
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      smallTargets.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  results.e_tap_targets_44px = { pass: smallTargets.length === 0, detail: viol(smallTargets) };

  // (f) text smaller than 11px
  const tinyText = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length > 0) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    const r = el.getBoundingClientRect();
    if (!isOnScreen(r)) return; // not visible right now (e.g. inside a closed drawer)
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size > 0 && size < 11) {
      tinyText.push(`${el.tagName.toLowerCase()} ${size}px "${text.slice(0, 20)}"`);
    }
  });
  results.f_min_font_11px = { pass: tinyText.length === 0, detail: viol(tinyText) };

  // (g) fixed chrome (bottom nav / floating chat / AI launcher) must not
  // overlap a primary action button.
  const overlaps = [];
  const fixedChrome = Array.from(document.querySelectorAll('.bottom-nav, .ai-launcher-btn, .floating-chat-launcher, [class*="floating-chat"]'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0);
  const primaryButtons = Array.from(document.querySelectorAll('button'))
    .filter((b) => {
      const cs = getComputedStyle(b);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !fixedChrome.some(({ el }) => el === b || el.contains(b));
    });
  fixedChrome.forEach(({ el, r }) => {
    primaryButtons.forEach((btn) => {
      const br = btn.getBoundingClientRect();
      if (br.width === 0 || br.height === 0) return;
      const overlapX = Math.min(r.right, br.right) - Math.max(r.left, br.left);
      const overlapY = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top);
      if (overlapX > 4 && overlapY > 4) {
        overlaps.push(`${el.className.toString().slice(0, 30)} overlaps button "${(btn.textContent || '').trim().slice(0, 20)}"`);
      }
    });
  });
  results.g_fixed_chrome_no_overlap = { pass: overlaps.length === 0, detail: viol(overlaps) };

  // (h) filters collapsed behind the shared Filters button on first load
  const filterButtons = Array.from(document.querySelectorAll('button')).filter((b) => /filters/i.test(b.textContent || ''));
  const openPanelsVisible = Array.from(document.querySelectorAll('.mobile-filters-panel')).some((p) => {
    const cs = getComputedStyle(p);
    return cs.display !== 'none' && p.getBoundingClientRect().height > 0;
  });
  if (filterButtons.length === 0) {
    results.h_filters_collapsed = { pass: true, detail: ['no MobileFilters on this page'] };
  } else {
    results.h_filters_collapsed = { pass: !openPanelsVisible, detail: openPanelsVisible ? ['a filters panel is open on first load'] : ['collapsed by default'] };
  }

  return results;
}

module.exports = { runChecks };
