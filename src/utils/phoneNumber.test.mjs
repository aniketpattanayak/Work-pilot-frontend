// Plain-Node tests for phoneNumber.js. Run with: node src/utils/phoneNumber.test.mjs
import assert from "node:assert/strict";
import {
  buildStoredNumber,
  parseStoredNumber,
  validateNationalNumber,
  maxNationalLength,
  INDIA_DIAL_CODE,
  COUNTRIES,
  findCountryById,
  findCountryByDialCode,
} from "./phoneNumber.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
};

// --- build ---

test("India: builds bare 10 digits, unchanged behaviour", () => {
  assert.equal(buildStoredNumber("91", "9876543210"), "9876543210");
});

test("UAE: builds dialCode + national concatenated", () => {
  assert.equal(buildStoredNumber("971", "501234567"), "971501234567");
});

test("USA: builds dialCode + national concatenated", () => {
  assert.equal(buildStoredNumber("1", "2025551234"), "12025551234");
});

test("UK: builds dialCode + national concatenated", () => {
  assert.equal(buildStoredNumber("44", "7911123456"), "447911123456");
});

test("Leading zero on national number is stripped (non-India)", () => {
  assert.equal(buildStoredNumber("971", "0501234567"), "971501234567");
});

test("India leading zero is NOT stripped (10-digit rule only)", () => {
  // Not a realistic India number, but build() must not special-case India's
  // digits beyond taking them as-is - validation is what rejects bad input.
  assert.equal(buildStoredNumber("91", "0123456789"), "0123456789");
});

// --- validate ---

test("India: valid 10-digit number passes", () => {
  assert.equal(validateNationalNumber("91", "9876543210").valid, true);
});

test("India: exact existing error message is preserved", () => {
  const r = validateNationalNumber("91", "12345");
  assert.equal(r.valid, false);
  assert.equal(
    r.message,
    "Please enter a 10-digit WhatsApp number (digits only, without 91 or +91)."
  );
});

test("UAE: valid national number passes", () => {
  assert.equal(validateNationalNumber("971", "501234567").valid, true);
});

test("15-digit total length boundary: exactly 15 is valid", () => {
  // dialCode "1" (1 digit) + 14-digit national = 15 total -> valid
  const national = "12345678901234";
  assert.equal(national.length, 14);
  assert.equal(buildStoredNumber("1", national).length, 15);
  assert.equal(validateNationalNumber("1", national).valid, true);
});

test("15-digit total length boundary: 16 total is invalid", () => {
  const national = "123456789012345"; // 15 digits -> 1 + 15 = 16, over limit
  assert.equal(validateNationalNumber("1", national).valid, false);
});

test("maxNationalLength caps at 15 total and at 14 national digits", () => {
  assert.equal(maxNationalLength("1"), 14);
  assert.equal(maxNationalLength("971"), 12);
  assert.equal(maxNationalLength(""), 14);
});

test("National number below 6 digits is invalid (non-India)", () => {
  assert.equal(validateNationalNumber("971", "12345").valid, false);
});

// --- 10-total-digit ambiguity (WhatsApp sender would mistake it for India) ---

test("Singapore 8-digit national (10 total) is rejected as ambiguous with India", () => {
  const r = validateNationalNumber("65", "12345678");
  assert.equal(r.valid, false);
  assert.equal(
    r.message,
    "This country's number would be mistaken for an Indian number by the WhatsApp sender, so it can't be saved yet. Please contact support."
  );
});

test("UAE 9-digit national (12 total) is still valid, not ambiguous", () => {
  assert.equal(validateNationalNumber("971", "501234567").valid, true);
});

test("USA 10-digit national (11 total) is still valid, not ambiguous", () => {
  assert.equal(validateNationalNumber("1", "2025551234").valid, true);
});

test("India is unaffected by the 10-total-digit ambiguity rule", () => {
  // India's own 10-digit numbers must keep passing - the rule only applies
  // to non-India dial codes.
  assert.equal(validateNationalNumber("91", "9876543210").valid, true);
});

test("Ambiguity check uses the stored (leading-zero-stripped) length", () => {
  // Raw input "012345678" (9 digits) strips to 8 digits -> 65 + 8 = 10,
  // still ambiguous even though the typed input was 9 digits.
  const r = validateNationalNumber("65", "012345678");
  assert.equal(r.valid, false);
});

// --- country list: US/Canada share a dial code but must stay distinct ---

test("US and Canada are separate entries sharing dial code '1'", () => {
  const us = findCountryById("US");
  const ca = findCountryById("CA");
  assert.equal(us.dialCode, "1");
  assert.equal(ca.dialCode, "1");
  assert.notEqual(us.id, ca.id);
});

test("Every country in the list has a unique id", () => {
  const ids = COUNTRIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("findCountryByDialCode('1') resolves to an entry whose dialCode is '1'", () => {
  const c = findCountryByDialCode("1");
  assert.equal(c.dialCode, "1");
});

// --- parse (edit round-trip) ---

test("Edit round-trip: stored 10-digit number -> India", () => {
  const { dialCode, nationalNumber } = parseStoredNumber("9876543210");
  assert.equal(dialCode, INDIA_DIAL_CODE);
  assert.equal(nationalNumber, "9876543210");
  assert.equal(buildStoredNumber(dialCode, nationalNumber), "9876543210");
});

test("Edit round-trip: stored 12-digit number starting with 91 -> India", () => {
  const { dialCode, nationalNumber } = parseStoredNumber("919876543210");
  assert.equal(dialCode, INDIA_DIAL_CODE);
  assert.equal(nationalNumber, "9876543210");
  assert.equal(buildStoredNumber(dialCode, nationalNumber), "9876543210");
});

test("Edit round-trip: stored foreign (UAE) number", () => {
  const stored = "971501234567";
  const { dialCode, nationalNumber } = parseStoredNumber(stored);
  assert.equal(dialCode, "971");
  assert.equal(nationalNumber, "501234567");
  assert.equal(buildStoredNumber(dialCode, nationalNumber), stored);
});

test("Edit round-trip: stored US number (dial code '1')", () => {
  const stored = "12025551234";
  const { dialCode, nationalNumber } = parseStoredNumber(stored);
  assert.equal(dialCode, "1");
  assert.equal(nationalNumber, "2025551234");
  assert.equal(buildStoredNumber(dialCode, nationalNumber), stored);
});

test("Parse: unmatched stored number falls back to raw digits, no country guessed", () => {
  const { dialCode, nationalNumber } = parseStoredNumber("55512");
  assert.equal(dialCode, null);
  assert.equal(nationalNumber, "55512");
});

test("Parse: longest-prefix match prefers 971 over shorter false prefixes", () => {
  const { dialCode } = parseStoredNumber("971501234567");
  assert.equal(dialCode, "971");
});

console.log(`\n${passed} tests passed`);
