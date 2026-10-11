import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { Wallet } from 'lucide-react';
import { dialog } from '../components/Dialog';
import usePermissions from '../components/usePermissions';
import PayrollRuns from '../components/PayrollRuns';
import PayrollSalaries from '../components/PayrollSalaries';
import PayrollSetup from '../components/PayrollSetup';
import PayslipModal from '../components/PayslipModal';
import { inr, monthLabel } from '../utils/payrollFormat';

/**
 * PAYROLL: your payslips, and (for people given payroll roles) payroll runs, salaries and setup.
 * Payroll is closed to everyone, Admins included, until it is given to a role (Settings > Roles & access).
 */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';

const MyPayslips = ({ myId }) => {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { setList((await API.get('/tasks/payroll/my-payslips')).data.payslips || []); }
    catch (e) { await dialog.alert(e?.response?.data?.message || 'Could not load your payslips.', { tone: 'error' }); setList([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!list) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;
  return (
    <div className={card}>
      <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-3">My payslips</h3>
      {list.length === 0 && <p className="text-sm font-bold text-muted-foreground">No payslip has been released for you yet.</p>}
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.runId} className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground">
            <span className="min-w-[8rem]">{monthLabel(p.month)}</span><span>Gross Rs. {inr(p.gross)}</span><span>Net pay Rs. {inr(p.net)}</span>
            <button type="button" aria-label={`Open payslip ${monthLabel(p.month)}`} className={ghost} onClick={() => setOpen(p)}>View payslip</button>
          </div>
        ))}
      </div>
      {open && <PayslipModal runId={open.runId} employeeId={myId} onClose={() => setOpen(null)} />}
    </div>
  );
};

const PayrollPage = () => {
  const { can, ready, modules } = usePermissions();
  const [tab, setTab] = useState('mine');
  const [myId, setMyId] = useState('');
  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || '{}'); setMyId(u.id || u._id || ''); } catch (e) { setMyId(''); }
  }, []);
  const runsAccess = ['payroll.prepare', 'payroll.approve', 'payroll.release', 'payroll.export', 'payroll.viewSalary', 'payroll.configure'].some((k) => can(k, 'company'));
  const tabs = [
    modules.payroll ? ['mine', 'My payslips'] : null,
    runsAccess ? ['runs', 'Payroll runs'] : null,
    can('payroll.viewSalary') ? ['salaries', 'Salaries'] : null,
    can('payroll.configure') ? ['setup', 'Setup'] : null
  ].filter(Boolean);
  const current = tabs.find((t) => t[0] === tab) ? tab : tabs[0]?.[0];

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase flex items-center gap-3 mb-6"><Wallet className="text-primary" /> Payroll</h2>
      {ready && tabs.length === 0 && <p className="text-sm font-bold text-muted-foreground">Payroll is not switched on for your company, or you do not have access to it yet.</p>}
      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border ${current === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>{l}</button>
          ))}
        </div>
      )}
      {current === 'mine' && <MyPayslips myId={myId} />}
      {current === 'runs' && <PayrollRuns can={can} />}
      {current === 'salaries' && <PayrollSalaries can={can} />}
      {current === 'setup' && <PayrollSetup can={can} />}
    </div>
  );
};

export default PayrollPage;
