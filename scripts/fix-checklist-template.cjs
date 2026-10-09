const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/BulkUpload.jsx');
const content = fs.readFileSync(file, 'utf8');

function patchLine(text, oldLine, newLine, label) {
  const count = text.split(oldLine).length - 1;
  if (count !== 1) {
    console.error(`❌ [${label}] Expected exactly 1 match, found ${count}.`);
    // Diagnostic: show the actual line from the file so we can see what differs
    const lines = text.split('\n');
    const found = lines.find(l => l.includes('CHECKLIST_' + label.split('_')[1]));
    if (found) {
      console.error('   Actual line in file (char codes shown for inspection):');
      console.error('   ' + JSON.stringify(found));
    }
    return null;
  }
  return text.split(oldLine).join(newLine);
}

let updated = content;

const oldHeaders = `const CHECKLIST_HEADERS = ['Checklist Title', 'Description', 'Assigned To', 'Frequency', 'Deadline', 'Items (semicolon separated)'];`;
const newHeaders = `const CHECKLIST_HEADERS = ['Checklist Title', 'Description', 'Assigned To', 'Frequency', 'Start Date'];`;
const r1 = patchLine(updated, oldHeaders, newHeaders, 'CHECKLIST_HEADERS');

const oldSample = `const CHECKLIST_SAMPLE = [['Quality Check', 'Check product quality before dispatch', 'Aniket', 'Daily', '2026-07-15', 'Check dimensions;Check weight;Check packaging;Attach photos']];`;
const newSample = `const CHECKLIST_SAMPLE = [['Quality Check', 'Check product quality before dispatch', 'Aniket', 'Daily', '2026-07-15']];`;
const r2 = patchLine(updated, oldSample, newSample, 'CHECKLIST_SAMPLE');

if (r1 === null || r2 === null) {
  console.error('Aborting — no changes written.');
  process.exit(1);
}

fs.writeFileSync(file, r2 === updated ? r1 : updated.split(oldHeaders).join(newHeaders).split(oldSample).join(newSample), 'utf8');
console.log('✅ Patched both lines.');
