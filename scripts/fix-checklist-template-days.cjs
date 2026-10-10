const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/BulkUpload.jsx');
const content = fs.readFileSync(file, 'utf8');

function patchLine(text, oldLine, newLine, label) {
  const count = text.split(oldLine).length - 1;
  if (count !== 1) {
    console.error(`❌ [${label}] Expected exactly 1 match, found ${count}. Aborting.`);
    process.exit(1);
  }
  return text.split(oldLine).join(newLine);
}

const oldHeaders = `const CHECKLIST_HEADERS = ['Checklist Title', 'Description', 'Assigned To', 'Frequency', 'Start Date'];`;
const newHeaders = `const CHECKLIST_HEADERS = ['Checklist Title', 'Description', 'Assigned To', 'Frequency', 'Start Date', 'Days of Week (if Weekly)', 'Days of Month (if Monthly)'];`;

const oldSample = `const CHECKLIST_SAMPLE = [['Quality Check', 'Check product quality before dispatch', 'Aniket', 'Daily', '2026-07-15']];`;
const newSample = `const CHECKLIST_SAMPLE = [
  ['Quality Check', 'Check product quality before dispatch', 'Aniket', 'Daily', '2026-07-15', '', ''],
  ['Weekly Review Meeting', 'Team sync on progress', 'Aniket', 'Weekly', '2026-07-15', 'Mon,Thu', ''],
  ['Inventory Count', 'Count and reconcile stock', 'Aniket', 'Monthly', '2026-07-01', '', '1,15'],
];`;

let updated = patchLine(content, oldHeaders, newHeaders, 'CHECKLIST_HEADERS');
updated = patchLine(updated, oldSample, newSample, 'CHECKLIST_SAMPLE');

fs.writeFileSync(file, updated, 'utf8');
console.log('✅ Patched.');
