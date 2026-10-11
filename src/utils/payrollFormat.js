// Small helpers for the Payroll screens: money, month names, amount in words, CSV download and the printable payslip.
export const inr = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const monthLabel = (m) => {
  if (!/^\d{4}-\d{2}$/.test(m || '')) return m || '';
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const below1000 = (n) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));
// Indian grouping: crore, lakh, thousand
export const rupeesInWords = (amount) => {
  const total = Math.round(Math.abs(Number(amount) || 0) * 100);
  let rupees = Math.floor(total / 100); const paise = total % 100;
  const parts = [];
  const crore = Math.floor(rupees / 10000000); rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000); rupees %= 100000;
  const thousand = Math.floor(rupees / 1000); rupees %= 1000;
  if (crore) parts.push(below1000(crore) + ' crore');
  if (lakh) parts.push(below100(lakh) + ' lakh');
  if (thousand) parts.push(below100(thousand) + ' thousand');
  if (rupees) parts.push(below1000(rupees));
  let words = parts.join(' ') || 'zero';
  words = 'Rupees ' + words;
  if (paise) words += ' and ' + below100(paise) + ' paise';
  return words.charAt(0).toUpperCase() + words.slice(1) + ' only';
};

export const downloadCsv = (filename, csv) => {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => inr(n);

// A complete, self-contained page for one payslip (shown in the viewer and used for printing).
export const payslipHtml = (p, company) => {
  const d = p.days || {};
  const rows = (list) => (list.length ? list.map((x) => `<tr><td>${esc(x.name)}</td><td class="r">${num(x.amount)}</td></tr>`).join('') : '<tr><td colspan="2" class="m">None</td></tr>');
  const earn = p.earnings || [], ded = p.deductions || [];
  const bank = p.bank || {};
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc(monthLabel(p.month))} ${esc(p.name)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:24px;font-size:13px}
  .box{max-width:760px;margin:0 auto;border:1px solid #333;padding:20px}
  h1{font-size:18px;margin:0}h2{font-size:14px;margin:4px 0 0;font-weight:normal}
  .head{text-align:center;border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:12px}
  .grid{display:flex;gap:16px;margin-bottom:12px}.grid>div{flex:1}
  table{width:100%;border-collapse:collapse}td,th{padding:5px 6px;border:1px solid #bbb;text-align:left}th{background:#eee}
  .r{text-align:right}.m{color:#777}.tot td{font-weight:bold;background:#f5f5f5}
  .net{margin-top:12px;border:1px solid #333;padding:10px;font-size:15px;font-weight:bold;display:flex;justify-content:space-between}
  .w{margin-top:6px;font-style:italic}.foot{margin-top:18px;font-size:11px;color:#555;text-align:center}
  @media print{body{padding:0}.box{border:none}}
</style></head><body><div class="box">
<div class="head"><h1>${esc((company && company.name) || '')}</h1>${company && company.address ? `<div>${esc(company.address)}</div>` : ''}<h2>Payslip for ${esc(monthLabel(p.month))}</h2></div>
<div class="grid"><div><b>Name:</b> ${esc(p.name)}<br><b>Department:</b> ${esc(p.department || '-')}${p.ids && p.ids.uan ? `<br><b>UAN:</b> ${esc(p.ids.uan)}` : ''}${p.ids && p.ids.esiNumber ? `<br><b>ESI no:</b> ${esc(p.ids.esiNumber)}` : ''}${p.ids && p.ids.pan ? `<br><b>PAN:</b> ${esc(p.ids.pan)}` : ''}</div>
<div><b>Days in month:</b> ${esc(d.daysInMonth)}<br><b>Paid days:</b> ${esc(d.payableDays)}<br><b>Unpaid days:</b> ${esc(d.unpaidDays)}</div>
<div><b>Bank:</b> ${esc(bank.bankName || '-')}<br><b>Account:</b> ${esc(bank.accountNumber || '-')}<br><b>IFSC:</b> ${esc(bank.ifsc || '-')}</div></div>
<div class="grid"><div><table><tr><th>Earnings</th><th class="r">Amount (Rs.)</th></tr>${rows(earn)}<tr class="tot"><td>Gross earnings</td><td class="r">${num(p.gross)}</td></tr></table></div>
<div><table><tr><th>Deductions</th><th class="r">Amount (Rs.)</th></tr>${rows(ded)}<tr class="tot"><td>Total deductions</td><td class="r">${num(p.totalDeductions)}</td></tr></table></div></div>
${p.rounding ? `<div class="m">Rounding: ${num(p.rounding)}</div>` : ''}
${(p.employer || []).length ? `<div style="margin-top:12px"><table><tr><th>Employer contributions (paid by the company, not deducted from your pay)</th><th class="r">Amount (Rs.)</th></tr>${rows(p.employer)}<tr class="tot"><td>Total</td><td class="r">${num(p.employerTotal)}</td></tr></table></div>` : ''}
<div class="net"><span>Net pay</span><span>Rs. ${num(p.net)}</span></div><div class="w">${esc(rupeesInWords(p.net))}</div>
<div class="foot">This is a computer-generated payslip and does not need a signature.</div>
</div></body></html>`;
};
