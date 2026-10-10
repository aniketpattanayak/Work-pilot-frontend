// Shared by Review Meeting and Global View.
// Colour rule (set by the Admin in Settings): at or above `red` -> red, at or above `orange` -> orange, otherwise green.
export const DEFAULT_THRESHOLDS = { red: 20, orange: 10 };

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
