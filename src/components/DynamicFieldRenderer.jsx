import React from 'react';

/**
 * Draws the company's custom fields inside a create/edit form.
 *   <DynamicFieldRenderer fields={fields} values={form.customFields} onChange={(name, v) => ...} />
 * Renders nothing when there are no fields, so forms look exactly as before.
 * `values` may be missing/null (old records) - every input then just starts empty.
 */
const inputCls = 'w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner disabled:opacity-60';
const labelCls = 'text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';

const plainInput = 'w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background/70 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';
const plainLabel = 'text-sm font-medium text-slate-600';

// variant "plain" matches the lighter task forms; the default matches the employee form.
export default function DynamicFieldRenderer({ fields, values, onChange, disabled = false, requireOnCreate = false, className = '', variant = 'form' }) {
  const plain = variant === 'plain';
  const list = Array.isArray(fields) ? fields.filter((f) => f && f.fieldName && f.isActive !== false) : [];
  if (list.length === 0) return null;
  const vals = values && typeof values === 'object' ? values : {};
  const get = (name) => (typeof vals.get === 'function' ? vals.get(name) : vals[name]);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 ${className}`} data-testid="custom-fields">
      {list.map((f) => {
        const id = `cf-${f.fieldName}`;
        const v = get(f.fieldName);
        const req = !!f.isRequired;
        const set = (val) => onChange && onChange(f.fieldName, val);
        const label = (
          <label htmlFor={id} className={plain ? plainLabel : labelCls}>
            {f.fieldLabel}{req && <span className="text-red-500"> *</span>}
          </label>
        );
        if (f.fieldType === 'boolean') {
          return (
            <div key={f.fieldName} className="flex flex-col">
              {label}
              <label className={`flex items-center gap-3 px-4 py-2.5 bg-background border border-border ${plain ? 'rounded-lg mt-1 text-sm' : 'rounded-2xl text-xs'} font-bold cursor-pointer select-none`}>
                <input id={id} type="checkbox" checked={v === true || v === 'true'} disabled={disabled}
                  onChange={(e) => set(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <span className="text-foreground">{v === true || v === 'true' ? 'Yes' : 'No'}</span>
              </label>
            </div>
          );
        }
        return (
          <div key={f.fieldName} className="flex flex-col">
            {label}
            {f.fieldType === 'select' ? (
              <select id={id} className={plain ? plainInput : inputCls} disabled={disabled} required={req && requireOnCreate}
                value={v === undefined || v === null ? '' : String(v)} onChange={(e) => set(e.target.value)}>
                <option value="">— Select —</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                {/* keep an old value visible even if the option was later removed */}
                {v && !(f.options || []).includes(String(v)) && <option value={String(v)}>{String(v)}</option>}
              </select>
            ) : (
              <input id={id} className={plain ? plainInput : inputCls} disabled={disabled} required={req && requireOnCreate}
                type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                step={f.fieldType === 'number' ? 'any' : undefined}
                maxLength={f.fieldType === 'text' ? 500 : undefined}
                value={v === undefined || v === null ? '' : String(v).slice(0, f.fieldType === 'date' ? 10 : 500)}
                onChange={(e) => set(e.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
