import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axiosConfig';
import { X, Printer } from 'lucide-react';
import { payslipHtml, monthLabel } from '../utils/payrollFormat';

/** One payslip in a popup, with a Print / save as PDF button. The same page is used for viewing and printing. */
const PayslipModal = ({ runId, employeeId, onClose }) => {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const frame = useRef(null);

  useEffect(() => {
    let live = true;
    API.get(`/tasks/payroll/payslip/${runId}/${employeeId}`)
      .then((r) => { if (live) setData(r.data); })
      .catch((e) => { if (live) setProblem(e?.response?.data?.message || 'Could not load the payslip.'); });
    return () => { live = false; };
  }, [runId, employeeId]);

  const html = data ? payslipHtml({ ...data.payslip }, data.company) : '';
  const print = () => {
    const w = frame.current && frame.current.contentWindow;
    if (w && typeof w.print === 'function') { try { w.focus(); w.print(); return; } catch (e) { /* fall through to a new window */ } }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 250);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Payslip" className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-3">
      <div className="mobile-sheet bg-card rounded-[2rem] border border-border shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <h3 className="text-foreground text-sm font-black uppercase tracking-widest">{data ? `Payslip, ${monthLabel(data.payslip.month)}` : 'Payslip'}</h3>
          <div className="flex gap-2">
            <button type="button" onClick={print} disabled={!data} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-2"><Printer size={14} /> Print / Save as PDF</button>
            <button type="button" aria-label="Close payslip" onClick={onClose} className="p-2 rounded-xl border border-border text-foreground"><X size={16} /></button>
          </div>
        </div>
        <div className="p-3 overflow-auto flex-1">
          {!data && !problem && <p className="text-sm font-bold text-muted-foreground p-4">Loading...</p>}
          {problem && <p className="text-sm font-bold text-red-500 p-4">{problem}</p>}
          {data && <iframe ref={frame} title="Payslip" srcDoc={html} className="w-full h-[68vh] bg-white rounded-xl border border-border" />}
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
