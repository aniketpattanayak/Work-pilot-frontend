import { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import {
  Plus, Trash2, Save, RefreshCcw, AlertCircle, Edit2,
  GripVertical, Hash, Type, List, Calendar, AlignLeft,
  Zap, ChevronDown, ChevronUp, CheckCircle2, X,
  Package, FileText, Settings, Eye
} from 'lucide-react';

// ─── FIELD TYPES ──────────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text',     label: 'Text',      icon: Type },
  { value: 'number',   label: 'Number',    icon: Hash },
  { value: 'dropdown', label: 'Dropdown',  icon: List },
  { value: 'date',     label: 'Date',      icon: Calendar },
  { value: 'textarea', label: 'Long text', icon: AlignLeft },
];

function fid() { return 'f_' + Math.random().toString(36).slice(2, 8); }

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
const Lbl = ({ ch }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-muted-foreground)', marginBottom: 5 }}>{ch}</div>
);
const Inp = (p) => (
  <input style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)', outline: 'none', boxSizing: 'border-box' }} {...p} />
);
const Sel = ({ children, ...p }) => (
  <select style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)', outline: 'none' }} {...p}>{children}</select>
);

// ─── DROPDOWN OPTIONS INPUT ─────────────────────────────────────────────────
// Uses local state so comma can be typed freely — only splits on blur/Enter
function DropdownOptionsInput({ options, onChange }) {
  const [raw, setRaw] = useState((options || []).join(', '));

  // Sync if parent resets options
  useEffect(() => {
    // Only sync from parent when field is first loaded (raw is empty)
    // Don't override while user is typing
  }, []);

  const commit = (val) => {
    const parsed = val.split(',').map(s => s.trim()).filter(Boolean);
    onChange(parsed);
  };

  return (
    <div>
      <Lbl ch="Options (comma separated)" />
      <textarea
        rows={2}
        placeholder="Export, Domestic, Local  (separate with comma)"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => commit(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
      />
      <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginTop: 3 }}>
        Type all options separated by commas. Click outside to save.
        {options.length > 0 && <span style={{ color: 'var(--color-primary)', marginLeft: 6 }}>{options.length} option{options.length !== 1 ? 's' : ''} saved</span>}
      </div>
    </div>
  );
}

// ─── FIELD CARD ───────────────────────────────────────────────────────────────
function FieldCard({ field, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const Icon = FIELD_TYPES.find(t => t.value === field.type)?.icon || Type;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--color-muted)', cursor: 'pointer' }}>
        <GripVertical size={13} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
        <Icon size={13} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{field.label || 'Untitled field'}</span>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}>{field.type}</span>
        {field.required && <span style={{ fontSize: 9, color: '#A32D2D', fontWeight: 700 }}>REQ</span>}
        <button onClick={e => { e.stopPropagation(); onDelete(field.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-foreground)', padding: 2, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-foreground)'}>
          <Trash2 size={12} />
        </button>
        {open ? <ChevronUp size={13} style={{ color: 'var(--color-muted-foreground)' }} /> : <ChevronDown size={13} style={{ color: 'var(--color-muted-foreground)' }} />}
      </div>
      {open && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--color-border)' }}>
          <div>
            <Lbl ch="Label" />
            <Inp placeholder="e.g. Customer Name" value={field.label}
              onChange={e => onUpdate(field.id, { label: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <Lbl ch="Type" />
              <Sel value={field.type} onChange={e => onUpdate(field.id, { type: e.target.value })}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl ch="Placeholder" />
              <Inp placeholder="Optional hint" value={field.placeholder || ''}
                onChange={e => onUpdate(field.id, { placeholder: e.target.value })} />
            </div>
          </div>
          {field.type === 'dropdown' && (
            <DropdownOptionsInput
              options={field.options || []}
              onChange={opts => onUpdate(field.id, { options: opts })}
            />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
            <input type="checkbox" checked={field.required || false}
              onChange={e => onUpdate(field.id, { required: e.target.checked })} />
            Required
          </label>
        </div>
      )}
    </div>
  );
}

// ─── FORM EDITOR ──────────────────────────────────────────────────────────────
function FormEditor({ form, tenantId, onSaved, onCancel }) {
  const isNew = !form?._id;

  const [formName, setFormName]        = useState(form?.name || '');
  const [orderFields, setOrderFields]  = useState(form?.orderFields || []);
  const [itemFields, setItemFields]    = useState(form?.itemFields || []);
  const [orderIdConfig, setOIC]        = useState(form?.orderIdConfig || { prefix: 'ORD', digits: 4, resetYearly: true, separator: '-', includeYear: true });
  const [lineItemConfig, setLIC]       = useState(form?.lineItemConfig || { enabled: true, prefix: 'ITEM', digits: 3, separator: '-' });
  const [activeTab, setActiveTab]      = useState('orderFields');
  const [saving, setSaving]            = useState(false);
  const [error, setError]              = useState('');

  // Auto-save draft to localStorage
  const DRAFT_KEY = `wp_order_form_draft_${tenantId}_${form?._id || 'new'}`;

  // Restore draft on mount (only for new forms or if no saved form)
  useEffect(() => {
    if (form?._id) return; // editing existing — don't restore draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.formName)     setFormName(d.formName);
        if (d.orderFields)  setOrderFields(d.orderFields);
        if (d.itemFields)   setItemFields(d.itemFields);
        if (d.orderIdConfig) setOIC(d.orderIdConfig);
        if (d.lineItemConfig) setLIC(d.lineItemConfig);
      }
    } catch (e) {}
  }, [DRAFT_KEY]);

  // Auto-save on every change
  useEffect(() => {
    if (!formName && orderFields.length === 0 && itemFields.length === 0) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        formName, orderFields, itemFields,
        orderIdConfig: orderIdConfig, lineItemConfig: lineItemConfig,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }, [formName, orderFields, itemFields, orderIdConfig, lineItemConfig, DRAFT_KEY]);

  const addField = (section) => {
    const f = { id: fid(), label: '', type: 'text', required: false, placeholder: '', options: [] };
    section === 'orderFields' ? setOrderFields(p => [...p, f]) : setItemFields(p => [...p, f]);
  };
  const updateField = (section, id, patch) => {
    const setter = section === 'orderFields' ? setOrderFields : setItemFields;
    setter(p => p.map(f => f.id === id ? { ...f, ...patch } : f));
  };
  const deleteField = (section, id) => {
    const setter = section === 'orderFields' ? setOrderFields : setItemFields;
    setter(p => p.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError('Enter a form name'); return; }
    setSaving(true); setError('');
    try {
      // If new form, save without templateId — it will be linked when building a flow
      await API.post('/fms2/forms', {
        tenantId,
        templateId: form?.templateId || undefined,
        formId:     form?._id || undefined,
        name: formName, orderFields, itemFields, orderIdConfig, lineItemConfig,
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch(e) {}
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  // Live ID preview
  const sep  = orderIdConfig.separator || '-';
  const year = new Date().getFullYear();
  const previewOrder    = [orderIdConfig.prefix || 'ORD', orderIdConfig.includeYear !== false ? year : null, '0001'].filter(Boolean).join(sep);
  const previewLineItem = lineItemConfig.enabled !== false ? `${previewOrder}${lineItemConfig.separator || '-'}${lineItemConfig.prefix || 'ITEM'}001` : null;

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setActiveTab(id)}
      style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', background: activeTab === id ? 'var(--color-primary)' : 'var(--color-card)', color: activeTab === id ? 'white' : 'var(--color-muted-foreground)' }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{isNew ? 'New order form' : `Edit — ${form.name}`}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            Design your form fields and auto-ID settings
            {!form?._id && (() => {
              try {
                const d = localStorage.getItem(DRAFT_KEY);
                if (d) {
                  const parsed = JSON.parse(d);
                  const t = new Date(parsed.savedAt);
                  return <span style={{ marginLeft: 8, fontSize: 11, color: '#27500A', background: '#EAF3DE', padding: '1px 7px', borderRadius: 6 }}>
                    Draft auto-saved at {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>;
                }
              } catch(e) {}
              return null;
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: '7px 16px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <RefreshCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save form'}
          </button>
        </div>
      </div>

      {/* Form name */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <Lbl ch="Form name *" />
        <Inp placeholder="e.g. Navtech Sales Order Form" value={formName}
          onChange={e => setFormName(e.target.value)} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, background: 'var(--color-muted)' }}>
        <TabBtn id="orderFields" label={`Order fields (${orderFields.length})`} />
        <TabBtn id="itemFields"  label={`Line item fields (${itemFields.length})`} />
        <TabBtn id="idSettings"  label="ID settings" />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* ORDER FIELDS */}
        {activeTab === 'orderFields' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 12, lineHeight: 1.6 }}>
              These fields appear once per order — filled by the employee when creating a new order. Examples: Customer Name, Order Date, Remarks.
            </div>
            {orderFields.map(f => (
              <FieldCard key={f.id} field={f}
                onUpdate={(id, p) => updateField('orderFields', id, p)}
                onDelete={id => deleteField('orderFields', id)} />
            ))}
            <button onClick={() => addField('orderFields')}
              style={{ width: '100%', padding: '9px 0', border: '1px dashed var(--color-border)', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={13} /> Add order field
            </button>
          </div>
        )}

        {/* ITEM FIELDS */}
        {activeTab === 'itemFields' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 12, lineHeight: 1.6 }}>
              These fields repeat for every line item — filled once per item in the order. Examples: Item Name, Qty, Unit, Promise Date.
            </div>
            {itemFields.map(f => (
              <FieldCard key={f.id} field={f}
                onUpdate={(id, p) => updateField('itemFields', id, p)}
                onDelete={id => deleteField('itemFields', id)} />
            ))}
            <button onClick={() => addField('itemFields')}
              style={{ width: '100%', padding: '9px 0', border: '1px dashed var(--color-border)', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={13} /> Add line item field
            </button>
          </div>
        )}

        {/* ID SETTINGS */}
        {activeTab === 'idSettings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Preview */}
            <div style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-muted-foreground)', marginBottom: 10 }}>Live preview</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>Order ID: </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>{previewOrder}</span>
              </div>
              {previewLineItem && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>Line item: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--color-foreground)' }}>{previewLineItem}</span>
                </div>
              )}
            </div>

            {/* Order ID config */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Order ID</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><Lbl ch="Prefix" /><Inp placeholder="ORD" value={orderIdConfig.prefix || ''} onChange={e => setOIC(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} /></div>
                <div><Lbl ch="Separator" /><Inp placeholder="-" value={orderIdConfig.separator || '-'} onChange={e => setOIC(p => ({ ...p, separator: e.target.value }))} /></div>
                <div><Lbl ch="Number digits" /><Inp type="number" min={1} max={8} value={orderIdConfig.digits || 4} onChange={e => setOIC(p => ({ ...p, digits: +e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', gap: 8, fontSize: 12, cursor: 'pointer', alignItems: 'center', color: 'var(--color-muted-foreground)' }}>
                  <input type="checkbox" checked={orderIdConfig.includeYear !== false} onChange={e => setOIC(p => ({ ...p, includeYear: e.target.checked }))} />
                  Include year in ID (e.g. 2026)
                </label>
                <label style={{ display: 'flex', gap: 8, fontSize: 12, cursor: 'pointer', alignItems: 'center', color: 'var(--color-muted-foreground)' }}>
                  <input type="checkbox" checked={orderIdConfig.resetYearly !== false} onChange={e => setOIC(p => ({ ...p, resetYearly: e.target.checked }))} />
                  Reset counter every year
                </label>
              </div>
            </div>

            {/* Line item config */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Line Item ID</div>
                <label style={{ display: 'flex', gap: 6, fontSize: 12, cursor: 'pointer', alignItems: 'center', color: 'var(--color-muted-foreground)' }}>
                  <input type="checkbox" checked={lineItemConfig.enabled !== false} onChange={e => setLIC(p => ({ ...p, enabled: e.target.checked }))} />
                  Enable multi-item orders
                </label>
              </div>
              {lineItemConfig.enabled !== false && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><Lbl ch="Prefix" /><Inp placeholder="ITEM" value={lineItemConfig.prefix || ''} onChange={e => setLIC(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} /></div>
                  <div><Lbl ch="Separator" /><Inp placeholder="-" value={lineItemConfig.separator || '-'} onChange={e => setLIC(p => ({ ...p, separator: e.target.value }))} /></div>
                  <div><Lbl ch="Digits" /><Inp type="number" min={1} max={6} value={lineItemConfig.digits || 3} onChange={e => setLIC(p => ({ ...p, digits: +e.target.value }))} /></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ margin: '0 20px 12px', padding: '8px 12px', background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#791F1F', flexShrink: 0 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function OrderFormsPage({ tenantId }) {
  const [forms, setForms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // null = list, 'new' = new, form obj = edit
  const [deleting, setDeleting] = useState(null);

  const fetchForms = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const r = await API.get(`/fms2/forms/${tenantId}`);
      setForms(Array.isArray(r.data) ? r.data : []);
    } catch { setForms([]); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleDelete = async (formId) => {
    if (!window.confirm('Delete this form? It will be unlinked from any flows using it.')) return;
    setDeleting(formId);
    try {
      await API.delete(`/fms2/forms/${formId}`);
      fetchForms();
    } catch { alert('Delete failed'); }
    finally { setDeleting(null); }
  };

  // ── EDITOR VIEW ─────────────────────────────────────────────────────────────
  if (editing !== null) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FormEditor
        form={editing === 'new' ? null : editing}
        tenantId={tenantId}
        onSaved={() => { fetchForms(); setEditing(null); }}
        onCancel={() => setEditing(null)}
      />
    </div>
  );

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={24} style={{ color: '#185FA5' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Order Forms</h1>
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.5 }}>
              Build forms your team uses to create orders. Each form can be linked to one or more FMS flows.
            </p>
          </div>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={15} /> New form
        </button>
      </div>

      {/* How it works */}
      <div style={{ background: '#E6F1FB', borderLeft: '2px solid #185FA5', borderRadius: '0 10px 10px 0', padding: '12px 16px', fontSize: 12, color: '#0C447C', lineHeight: 1.7, marginBottom: 24 }}>
        <strong>How it works:</strong> Build a form here first → then go to <strong>Flow Management → New flow</strong> → choose <strong>WorkPilot Form</strong> as the data source → select this form. When an employee submits an order, WorkPilot auto-generates the Order ID, creates a flow instance per line item, and starts the flow.
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--color-muted-foreground)', fontSize: 13 }}>
          <RefreshCcw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading forms…
        </div>
      )}

      {/* Empty state */}
      {!loading && forms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--color-border)', borderRadius: 14, color: 'var(--color-muted-foreground)' }}>
          <FileText size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No order forms yet</div>
          <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Create your first form. You can link it to an FMS flow later.
          </div>
          <button onClick={() => setEditing('new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            <Plus size={14} /> Create first form
          </button>
        </div>
      )}

      {/* Forms list */}
      {!loading && forms.map(form => {
        const orderCount = (form.orderFields || []).length;
        const itemCount  = (form.itemFields || []).length;
        const cfg        = form.orderIdConfig || {};
        const year       = new Date().getFullYear();
        const sep        = cfg.separator || '-';
        const previewId  = [cfg.prefix || 'ORD', cfg.includeYear !== false ? year : null, '0001'].filter(Boolean).join(sep);
        const linked     = !!form.templateId;

        return (
          <div key={form._id}
            style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px', marginBottom: 12, background: 'var(--color-card)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Icon */}
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package size={20} style={{ color: '#185FA5' }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{form.name}</span>
                {linked ? (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>
                    ✓ Linked to a flow
                  </span>
                ) : (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#FAEEDA', color: '#854F0B', fontWeight: 600 }}>
                    Not linked yet
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-muted-foreground)', flexWrap: 'wrap', marginBottom: 8 }}>
                <span>{orderCount} order field{orderCount !== 1 ? 's' : ''}</span>
                <span>{itemCount} line item field{itemCount !== 1 ? 's' : ''}</span>
                <span>ID: <code style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>{previewId}</code></span>
              </div>

              {/* Field badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[...(form.orderFields || []), ...(form.itemFields || [])].slice(0, 6).map(f => (
                  <span key={f.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                    {f.label || 'Untitled'}
                  </span>
                ))}
                {(orderCount + itemCount) > 6 && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                    +{orderCount + itemCount - 6} more
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditing(form)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-card)', cursor: 'pointer', color: 'var(--color-foreground)' }}>
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={() => handleDelete(form._id)} disabled={deleting === form._id}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #F09595', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#A32D2D' }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}