// Returns an error text, or '' when the reason is fine
export const reasonError = (value, required = true) => {
  const v = value || {};
  if (required && !v.reason) return 'Please choose a reason.';
  if (v.reason === 'Other' && !String(v.note || '').trim()) return 'Please write a note when the reason is "Other".';
  return '';
};
