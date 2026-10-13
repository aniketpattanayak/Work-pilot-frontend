// Phone number helpers for the WhatsApp number field.
//
// Storage contract (must not change for India):
//   - India: exactly 10 digits, stored as-is (no "91", no "+").
//   - Other countries: dialCode digits + national number digits concatenated,
//     no separators, no "+". Total length (dialCode + national) <= 15 digits,
//     national number is 6-14 digits, no leading zero.
//
// This module is pure (no React) so it can be unit tested with plain Node.

export const INDIA_DIAL_CODE = "91";

// A sensible list of common countries. Order doesn't matter for lookups
// (longest-prefix match handles ambiguity), but India is first since it's
// the default selection.
export const COUNTRIES = [
  { name: "India", flag: "🇮🇳", dialCode: "91" },
  { name: "United States", flag: "🇺🇸", dialCode: "1" },
  { name: "Canada", flag: "🇨🇦", dialCode: "1" },
  { name: "United Kingdom", flag: "🇬🇧", dialCode: "44" },
  { name: "United Arab Emirates", flag: "🇦🇪", dialCode: "971" },
  { name: "Saudi Arabia", flag: "🇸🇦", dialCode: "966" },
  { name: "Australia", flag: "🇦🇺", dialCode: "61" },
  { name: "Singapore", flag: "🇸🇬", dialCode: "65" },
  { name: "Germany", flag: "🇩🇪", dialCode: "49" },
  { name: "France", flag: "🇫🇷", dialCode: "33" },
  { name: "Nepal", flag: "🇳🇵", dialCode: "977" },
  { name: "Bangladesh", flag: "🇧🇩", dialCode: "880" },
  { name: "Sri Lanka", flag: "🇱🇰", dialCode: "94" },
  { name: "Pakistan", flag: "🇵🇰", dialCode: "92" },
  { name: "Qatar", flag: "🇶🇦", dialCode: "974" },
  { name: "Oman", flag: "🇴🇲", dialCode: "968" },
  { name: "Kuwait", flag: "🇰🇼", dialCode: "965" },
  { name: "Bahrain", flag: "🇧🇭", dialCode: "973" },
  { name: "South Africa", flag: "🇿🇦", dialCode: "27" },
  { name: "Nigeria", flag: "🇳🇬", dialCode: "234" },
];

export const isIndia = (dialCode) => dialCode === INDIA_DIAL_CODE;

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

// Strip a single leading zero from a national number (non-India only).
export const stripLeadingZero = (digits) =>
  digits.length > 1 && digits[0] === "0" ? digits.slice(1) : digits;

// Max national-number digits allowed for a given dial code, so that
// dialCode.length + national.length <= 15.
export const maxNationalLength = (dialCode) =>
  Math.max(0, Math.min(14, 15 - String(dialCode || "").length));

/**
 * Validate a national number for a given dial code.
 * Returns { valid: boolean, message?: string }.
 */
export const validateNationalNumber = (dialCode, nationalNumber) => {
  const digits = onlyDigits(nationalNumber);
  if (isIndia(dialCode)) {
    if (!/^\d{10}$/.test(digits)) {
      return {
        valid: false,
        message: "Please enter a 10-digit WhatsApp number (digits only, without 91 or +91).",
      };
    }
    return { valid: true };
  }
  const max = maxNationalLength(dialCode);
  if (digits.length < 6 || digits.length > max || digits.length > 14) {
    return {
      valid: false,
      message: `Please enter a valid WhatsApp number (6-14 digits, ${dialCode.length + 6}-${dialCode.length + max} digits total with the country code).`,
    };
  }
  return { valid: true };
};

/**
 * Build the final stored string from a dial code + national number.
 * India: returns the bare 10 digits (unchanged behaviour).
 * Others: dialCode + national digits concatenated, no leading zero.
 */
export const buildStoredNumber = (dialCode, nationalNumber) => {
  const digits = onlyDigits(nationalNumber);
  if (isIndia(dialCode)) {
    return digits;
  }
  return `${dialCode}${stripLeadingZero(digits)}`;
};

/**
 * Parse a stored WhatsApp number string into { dialCode, nationalNumber }
 * for display/editing. Never alters the semantic value - reconstructing via
 * buildStoredNumber(dialCode, nationalNumber) for India, or
 * `${dialCode}${nationalNumber}` for others, yields back the original digits
 * (unless the stored value had no country match, in which case dialCode is
 * null and nationalNumber is the raw stored digits, so nothing is assumed).
 */
export const parseStoredNumber = (stored) => {
  const digits = onlyDigits(stored);

  if (digits.length === 10) {
    return { dialCode: INDIA_DIAL_CODE, nationalNumber: digits };
  }
  if (digits.length === 12 && digits.startsWith(INDIA_DIAL_CODE)) {
    return { dialCode: INDIA_DIAL_CODE, nationalNumber: digits.slice(2) };
  }

  // Longest-prefix match against known dial codes (excluding India, which
  // is already handled above and would otherwise match almost anything).
  const candidates = COUNTRIES
    .filter((c) => !isIndia(c.dialCode))
    .map((c) => c.dialCode)
    .filter((code, idx, arr) => arr.indexOf(code) === idx) // de-dupe
    .sort((a, b) => b.length - a.length);

  for (const code of candidates) {
    if (digits.startsWith(code) && digits.length > code.length) {
      return { dialCode: code, nationalNumber: digits.slice(code.length) };
    }
  }

  // No match: don't guess. Show raw digits, no country pre-selected.
  return { dialCode: null, nationalNumber: digits };
};
