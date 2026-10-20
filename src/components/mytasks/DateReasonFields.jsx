import React from 'react';
import useDateReasons from '../../hooks/useDateReasons';

const inp = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20';

/** Reason (from the company's list) + an optional note. value = { reason, note }. */
export default function DateReasonFields({ value, onChange, invalid = false }) {
  const { reasons, required } = useDateReasons();
  const v = value || { reason: '', note: '' };
  const needNote = v.reason === 'Other';
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Reason{required ? ' *' : ''}</label>
        <select aria-label="Reason for the change" value={v.reason} onChange={(e) => onChange({ ...v, reason: e.target.value })}
          className={`${inp} ${invalid && required && !v.reason ? 'border-red-500' : ''}`}>
          <option value="">Choose a reason…</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Note{needNote ? ' *' : ' (optional)'}</label>
        <textarea aria-label="Note" rows={2} value={v.note} onChange={(e) => onChange({ ...v, note: e.target.value })}
          className={`${inp} resize-none ${invalid && needNote && !v.note.trim() ? 'border-red-500' : ''}`} placeholder="Add a few words…" />
      </div>
    </div>
  );
}
