// Shared by Review Meeting, Global View, and Dashboard.
// Colour rule (set by the Admin in Settings): at or above `red` -> red, at or above `orange` -> orange, otherwise green.
export const DEFAULT_THRESHOLDS = { red: 20, orange: 10 };

/**
 * DYNAMIC PERCENTAGE COLOR-CODING SYSTEM
 * Rules:
 *  - 1–10: Green Shades (gradual transition from light green to deep green)
 *  - 11–20: Yellow Shades (gradual transition from light yellow to deep yellow)
 *  - 21 and Above: Red Shades (gradual transition from light red to deep red)
 *  - Values > 30 remain in deep red color range
 */
export const DEFAULT_DYNAMIC_COLOR_RANGES = [
  {
    id: 'green',
    name: 'Green Shades (Optimal)',
    min: 1,
    max: 10,
    startColor: '#dcfce7', // Light green (green-100)
    endColor: '#15803d'   // Deep green (green-700)
  },
  {
    id: 'yellow',
    name: 'Yellow Shades (Attention)',
    min: 11,
    max: 20,
    startColor: '#fef9c3', // Light yellow (yellow-100)
    endColor: '#ca8a04'   // Deep yellow / amber (yellow-600)
  },
  {
    id: 'red',
    name: 'Red Shades (Critical)',
    min: 21,
    max: 30,
    startColor: '#fee2e2', // Light red (red-100)
    endColor: '#b91c1c'   // Deep red (red-700)
  }
];

export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return [200, 200, 200];
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return [200, 200, 200];
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return [200, 200, 200];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

export const rgbToHex = (r, g, b) => {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
};

export const interpolateRgb = (rgb1, rgb2, factor) => {
  const t = Math.max(0, Math.min(1, factor));
  return [
    Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t),
    Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t),
    Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t)
  ];
};

export const getStoredDynamicColors = () => {
  try {
    const raw = localStorage.getItem('workpilot_dynamic_colors');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return null;
};

export const setStoredDynamicColors = (colors) => {
  try {
    if (colors) {
      localStorage.setItem('workpilot_dynamic_colors', JSON.stringify(colors));
    } else {
      localStorage.removeItem('workpilot_dynamic_colors');
    }
  } catch (e) {
    /* ignore */
  }
};

/**
 * Returns dynamic color tokens { bg, text, border, rangeId, factor } for any percentage.
 */
export const getDynamicPctColor = (value, customConfig) => {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return {
      bg: 'transparent',
      text: 'inherit',
      border: 'transparent',
      rangeId: 'none'
    };
  }

  // Determine active ranges: passed custom config > stored in localStorage > default
  let ranges = null;
  if (customConfig && Array.isArray(customConfig.ranges)) {
    ranges = customConfig.ranges;
  } else if (Array.isArray(customConfig)) {
    ranges = customConfig;
  } else {
    const stored = getStoredDynamicColors();
    if (stored && Array.isArray(stored.ranges)) ranges = stored.ranges;
    else if (Array.isArray(stored)) ranges = stored;
  }

  if (!ranges || ranges.length < 3) {
    ranges = DEFAULT_DYNAMIC_COLOR_RANGES;
  }

  const r1 = ranges[0] || DEFAULT_DYNAMIC_COLOR_RANGES[0];
  const r2 = ranges[1] || DEFAULT_DYNAMIC_COLOR_RANGES[1];
  const r3 = ranges[2] || DEFAULT_DYNAMIC_COLOR_RANGES[2];

  let activeRange = r1;
  let factor = 0;

  if (v <= Number(r1.max)) {
    // 1–10: Green Shades
    activeRange = r1;
    const min = Number(r1.min);
    const max = Number(r1.max);
    factor = max === min ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min)));
  } else if (v <= Number(r2.max)) {
    // 11–20: Yellow Shades
    activeRange = r2;
    const min = Number(r2.min);
    const max = Number(r2.max);
    factor = max === min ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min)));
  } else {
    // 21 and Above: Red Shades. Values >= r3.max (e.g. 30+) remain at factor = 1.0 (deepest red)
    activeRange = r3;
    const min = Number(r3.min);
    const max = Number(r3.max);
    factor = max === min ? 1 : Math.max(0, Math.min(1, (v - min) / (max - min)));
  }

  const rgb1 = hexToRgb(activeRange.startColor);
  const rgb2 = hexToRgb(activeRange.endColor);
  const [r, g, b] = interpolateRgb(rgb1, rgb2, factor);
  const bg = rgbToHex(r, g, b);

  // Compute contrast text: relative luminance calculation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  let text = '#0f172a';
  if (luminance < 145) {
    text = '#ffffff';
  } else {
    if (activeRange.id === 'green') text = '#14532d';
    else if (activeRange.id === 'yellow') text = '#713f12';
    else text = '#7f1d1d';
  }

  // Subtle matching border (darker than background)
  const borderRgb = [Math.max(0, r - 35), Math.max(0, g - 35), Math.max(0, b - 35)];
  const border = rgbToHex(...borderRgb);

  return {
    bg,
    text,
    border,
    rangeId: activeRange.id,
    factor,
    rgb: [r, g, b]
  };
};

/**
 * Returns an inline style object { backgroundColor, color, borderColor }
 */
export const getPctStyle = (value, customConfig) => {
  const { bg, text, border } = getDynamicPctColor(value, customConfig);
  return {
    backgroundColor: bg,
    color: text,
    borderColor: border
  };
};

export const pctTone = (pct, thresholds) => {
  const t = thresholds || DEFAULT_THRESHOLDS;
  const v = Number(pct);
  if (!Number.isFinite(v)) return 'green';
  if (v >= t.red) return 'red';
  if (v >= t.orange) return 'orange';
  return 'green';
};

export const TONE_CLASSES = {
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
};

export const PERIOD_LABELS = {
  Daily: 'Daily',
  Weekly: 'Weekly',
  TwiceMonthly: 'Twice a month',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly'
};

// Move to the previous / next review period: the server maps any date inside a period to that period.
export const neighbourDate = (periodInfo, direction) => {
  if (!periodInfo || !periodInfo.startDate || !periodInfo.endDate) return null;
  const base = direction < 0 ? new Date(periodInfo.startDate).getTime() - 1 : new Date(periodInfo.endDate).getTime() + 1;
  return new Date(base).toISOString();
};
