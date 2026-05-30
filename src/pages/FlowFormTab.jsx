import { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import {
  Plus, Trash2, Save, RefreshCcw, AlertCircle, GripVertical,
  Hash, Type, List, Calendar, AlignLeft, Zap, Eye, EyeOff,
  Package, ChevronDown, ChevronUp, CheckCircle2, X
} from 'lucide-react';

// ─── FIELD TYPES ──────────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text',     label: 'Text',        icon: <Type size={12} /> },
  { value: 'number',   label: 'Number',      icon: <Hash size={12} /> },
  { value: 'dropdown', label: 'Dropdown',    icon: <List size={12} /> },
  { value: 'date',     label: 'Date',        icon: <Calendar size={12} /> },
  { value: 'textarea', label: 'Long text',   icon: <AlignLeft size={12} /> },
  { value: 'autoid',   label: 'Auto ID',     icon: <Zap size={12} /> },
];

function fid() { return 'f_' + Math.random().toString(36).slice(2, 8); }

const Label = ({ children }) => (
  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{children}</label>
);
const Inp = (p) => (
  <input className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" {...p} />
);
const Sel = ({ children, ...p }) => (
  <select className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" {...p}>{children}</select>
);

// ─── FIELD CARD ───────────────────────────────────────────────────────────────
function FieldCard({ field, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-2">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold flex-1 truncate">{field.label || 'Untitled field'}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{field.type}</span>
        {field.required && <span className="text-[9px] text-red-500 font-bold">REQ</span>}
        <button onClick={e => { e.stopPropagation(); onDelete(field.id); }}
          className="p-1 hover:text-red-500 text-muted-foreground transition-colors">
          <Trash2 size={12} />
        </button>
        {expanded ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-border">
          <div>
            <Label>Field label</Label>
            <Inp placeholder="e.g. Customer Name" value={field.label}
              onChange={e => onUpdate(field.id, { label: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Sel value={field.type} onChange={e => onUpdate(field.id, { type: e.target.value })}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Placeholder</Label>
              <Inp placeholder="Optional hint" value={field.placeholder || ''}
                onChange={e => onUpdate(field.id, { placeholder: e.target.value })} />
            </div>
          </div>
          {field.type === 'dropdown' && (
            <div>
              <Label>Options (comma separated)</Label>
              <Inp placeholder="Option 1, Option 2, Option 3"
                value={(field.options || []).join(', ')}
                onChange={e => onUpdate(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          )}
          {field.type === 'autoid' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-[11px] text-amber-700 dark:text-amber-400">
              Auto ID is configured in the ID Settings section below. This field will be auto-filled on submission.
            </div>
          )}
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={field.required || false}
              onChange={e => onUpdate(field.id, { required: e.target.checked })} />
            <span className="text-muted-foreground">Required field</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── ORDER ENTRY MODAL ───────────────────────────────────────────────────────
function OrderEntryModal({ form, tenantId, onClose, onSubmitted }) {
  const [orderValues, setOrderValues] = useState({});
  const [lineItems, setLineItems] = useState([{ id: Date.now(), values: {} }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const addLineItem = () => setLineItems(prev => [...prev, { id: Date.now(), values: {} }]);
  const removeLineItem = (id) => setLineItems(prev => prev.filter(l => l.id !== id));
  const updateLineItem = (id, fieldLabel, value) => {
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, values: { ...l.values, [fieldLabel]: value } } : l));
  };

  const handleSubmit = async () => {
    setError('');
    // Validate required order fields
    for (const f of (form.orderFields || [])) {
      if (f.required && !orderValues[f.label]) {
        setError(`"${f.label}" is required`); return;
      }
    }
    // Validate required item fields
    for (const item of lineItems) {
      for (const f of (form.itemFields || [])) {
        if (f.required && !item.values[f.label]) {
          setError(`"${f.label}" is required for all line items`); return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await API.post('/fms2/forms/submit', {
        formId:           form._id,
        orderFieldValues: orderValues,
        lineItems:        lineItems.map(l => ({ fieldValues: l.values })),
      });
      setSuccess(res.data);
      onSubmitted?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
        <h3 className="text-lg font-bold mb-2">Order Submitted!</h3>
        <div className="text-2xl font-black text-primary mb-2">{success.orderId}</div>
        <p className="text-sm text-muted-foreground mb-4">
          {success.lineItems.length} line item{success.lineItems.length > 1 ? 's' : ''} created and flows started.
        </p>
        <div className="space-y-1 mb-6">
          {success.lineItems.map((item, i) => (
            <div key={i} className="text-xs font-mono bg-muted px-3 py-1.5 rounded-lg">{item.lineItemId}</div>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-bold text-sm">{form.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">New order entry</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {/* Order-level fields */}
          {(form.orderFields || []).length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Order Details</div>
              <div className="grid grid-cols-2 gap-3">
                {form.orderFields.filter(f => f.type !== 'autoid').map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    {field.type === 'textarea' ? (
                      <textarea placeholder={field.placeholder} value={orderValues[field.label] || ''}
                        onChange={e => setOrderValues(p => ({ ...p, [field.label]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]" />
                    ) : field.type === 'dropdown' ? (
                      <Sel value={orderValues[field.label] || ''}
                        onChange={e => setOrderValues(p => ({ ...p, [field.label]: e.target.value }))}>
                        <option value="">Select…</option>
                        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </Sel>
                    ) : (
                      <Inp type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        placeholder={field.placeholder} value={orderValues[field.label] || ''}
                        onChange={e => setOrderValues(p => ({ ...p, [field.label]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Line Items ({lineItems.length})
              </div>
              <button onClick={addLineItem}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                <Plus size={12} /> Add item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={item.id} className="border border-border rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground">Item {idx + 1}</span>
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(form.itemFields || []).filter(f => f.type !== 'autoid').map(field => (
                    <div key={field.id} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                      <Label>{field.label}{field.required && ' *'}</Label>
                      {field.type === 'dropdown' ? (
                        <Sel value={item.values[field.label] || ''}
                          onChange={e => updateLineItem(item.id, field.label, e.target.value)}>
                          <option value="">Select…</option>
                          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </Sel>
                      ) : (
                        <Inp type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          placeholder={field.placeholder} value={item.values[field.label] || ''}
                          onChange={e => updateLineItem(item.id, field.label, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg flex items-center gap-2 text-[11px] text-red-600">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div className="px-5 pb-4 pt-2 border-t border-border flex-shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <RefreshCcw size={14} className="animate-spin" /> : <Package size={14} />}
            {submitting ? 'Submitting…' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowFormTab({ tenantId, templateId: propTemplateId }) {
  const [orderFields, setOrderFields]  = useState([]);
  const [itemFields, setItemFields]    = useState([]);
  const [orderIdConfig, setOrderIdConfig] = useState({ prefix: 'ORD', digits: 4, resetYearly: true, separator: '-', includeYear: true });
  const [lineItemConfig, setLineItemConfig] = useState({ enabled: true, prefix: 'ITEM', digits: 3, separator: '-' });
  const [formName, setFormName]        = useState('');
  const [saving, setSaving]            = useState(false);
  const [error, setError]              = useState('');
  const [saved, setSaved]              = useState(false);
  const [showEntry, setShowEntry]      = useState(false);
  const [existingForm, setExistingForm] = useState(null);
  const [activeSection, setActiveSection] = useState('orderFields');

  // Flow selector state
  const [allFlows, setAllFlows]           = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(propTemplateId || '');
  const [loadingFlows, setLoadingFlows]   = useState(false);

  // Load all flows for this tenant so admin can pick which one to link
  useEffect(() => {
    if (!tenantId) return;
    setLoadingFlows(true);
    API.get(`/fms2/templates/${tenantId}`)
      .then(r => {
        const flows = Array.isArray(r.data) ? r.data : (r.data?.templates || []);
        setAllFlows(flows);
        // Auto-select the prop templateId if passed (just deployed)
        if (propTemplateId && !selectedTemplateId) {
          setSelectedTemplateId(propTemplateId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFlows(false));
  }, [tenantId]);

  // When templateId changes, load the existing form for that template (if any)
  useEffect(() => {
    if (!selectedTemplateId) {
      // Reset form fields when no template selected
      setExistingForm(null);
      setFormName('');
      setOrderFields([]);
      setItemFields([]);
      setOrderIdConfig({ prefix: 'ORD', digits: 4, resetYearly: true, separator: '-', includeYear: true });
      setLineItemConfig({ enabled: true, prefix: 'ITEM', digits: 3, separator: '-' });
      return;
    }
    API.get(`/fms2/forms/template/${selectedTemplateId}`)
      .then(r => {
        const f = r.data;
        setExistingForm(f);
        setFormName(f.name);
        setOrderFields(f.orderFields || []);
        setItemFields(f.itemFields || []);
        setOrderIdConfig(f.orderIdConfig || { prefix: 'ORD', digits: 4, resetYearly: true, separator: '-', includeYear: true });
        setLineItemConfig(f.lineItemConfig || { enabled: true, prefix: 'ITEM', digits: 3, separator: '-' });
      })
      .catch(() => {
        // No form yet for this template — reset to blank
        setExistingForm(null);
        setFormName('');
        setOrderFields([]);
        setItemFields([]);
      });
  }, [selectedTemplateId]);

  const addField = (section) => {
    const newField = { id: fid(), label: '', type: 'text', required: false, placeholder: '', options: [] };
    if (section === 'orderFields') setOrderFields(p => [...p, newField]);
    else setItemFields(p => [...p, newField]);
  };

  const updateField = (section, id, patch) => {
    const setter = section === 'orderFields' ? setOrderFields : setItemFields;
    setter(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const deleteField = (section, id) => {
    const setter = section === 'orderFields' ? setOrderFields : setItemFields;
    setter(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setError('');
    if (!formName) { setError('Enter a form name'); return; }
    if (!selectedTemplateId) { setError('Please select a flow to link this form to'); return; }

    setSaving(true);
    try {
      await API.post('/fms2/forms', {
        tenantId, templateId: selectedTemplateId, name: formName,
        orderFields, itemFields, orderIdConfig, lineItemConfig,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  // Preview of auto-generated ID
  const year = new Date().getFullYear();
  const sep  = orderIdConfig.separator || '-';
  const previewOrderId = [
    orderIdConfig.prefix || 'ORD',
    orderIdConfig.includeYear !== false ? year : null,
    '0001',
  ].filter(Boolean).join(sep);
  const previewLineItemId = `${previewOrderId}${lineItemConfig.separator || '-'}${lineItemConfig.prefix || 'ITEM'}001`;

  const SectionBtn = ({ id, label }) => (
    <button onClick={() => setActiveSection(id)}
      className={`px-4 py-2 text-[11px] font-semibold rounded-lg transition-all ${activeSection === id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-primary" />
          <span className="text-sm font-bold">Order Form</span>
          <span className="text-[10px] text-muted-foreground">(optional — use instead of Google Sheet)</span>
        </div>
        <div className="flex items-center gap-2">
          {existingForm && (
            <button onClick={() => setShowEntry(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100 transition">
              <Plus size={12} /> New Order
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition disabled:opacity-50">
            {saving ? <RefreshCcw size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save form'}
          </button>
        </div>
      </div>

      {/* Flow selector — which flow does this form belong to */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-muted/20">
        <Label>Link this form to a flow *</Label>
        <div className="flex gap-2 items-center">
          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          >
            <option value="">— Select a flow —</option>
            {allFlows.map(flow => (
              <option key={flow._id} value={flow._id}>
                {flow.name}
                {flow.dataSource === 'form' ? ' ✓ (form linked)' : ''}
              </option>
            ))}
          </select>
          {loadingFlows && <RefreshCcw size={14} className="animate-spin text-muted-foreground flex-shrink-0" />}
        </div>
        {!selectedTemplateId && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Build and deploy a flow in the Flow Canvas tab first, then come back here to design its form.
          </p>
        )}
        {selectedTemplateId && !existingForm && (
          <p className="text-[10px] text-emerald-600 mt-1">
            No form yet for this flow — fill in the fields below and save.
          </p>
        )}
        {existingForm && (
          <p className="text-[10px] text-primary mt-1">
            Form already exists for this flow — you are editing it.
          </p>
        )}
      </div>

      {/* Form name */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Label>Form name</Label>
        <Inp placeholder="e.g. Navtech PO Form" value={formName} onChange={e => setFormName(e.target.value)} />
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border flex-shrink-0 bg-muted/20">
        <SectionBtn id="orderFields" label="Order Fields" />
        <SectionBtn id="itemFields"  label="Line Item Fields" />
        <SectionBtn id="idSettings"  label="ID Settings" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* ORDER FIELDS */}
        {activeSection === 'orderFields' && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-3">These fields appear once per order (e.g. Customer Name, Order Date).</p>
            {orderFields.map(f => (
              <FieldCard key={f.id} field={f}
                onUpdate={(id, patch) => updateField('orderFields', id, patch)}
                onDelete={(id) => deleteField('orderFields', id)} />
            ))}
            <button onClick={() => addField('orderFields')}
              className="w-full py-2 border border-dashed border-border rounded-xl text-[11px] font-medium text-muted-foreground hover:bg-muted transition flex items-center justify-center gap-1 mt-2">
              <Plus size={11} /> Add order field
            </button>
          </div>
        )}

        {/* ITEM FIELDS */}
        {activeSection === 'itemFields' && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-3">These fields repeat for each line item (e.g. Item Name, Qty, Unit).</p>
            {itemFields.map(f => (
              <FieldCard key={f.id} field={f}
                onUpdate={(id, patch) => updateField('itemFields', id, patch)}
                onDelete={(id) => deleteField('itemFields', id)} />
            ))}
            <button onClick={() => addField('itemFields')}
              className="w-full py-2 border border-dashed border-border rounded-xl text-[11px] font-medium text-muted-foreground hover:bg-muted transition flex items-center justify-center gap-1 mt-2">
              <Plus size={11} /> Add line item field
            </button>
          </div>
        )}

        {/* ID SETTINGS */}
        {activeSection === 'idSettings' && (
          <div className="space-y-5">
            {/* Preview */}
            <div className="bg-muted/50 border border-border rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Preview</div>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">Order ID: </span>
                  <span className="font-mono font-bold text-primary text-sm">{previewOrderId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Line Item ID: </span>
                  <span className="font-mono font-bold text-sm">{previewLineItemId}</span>
                </div>
              </div>
            </div>

            {/* Order ID config */}
            <div>
              <div className="text-[11px] font-bold mb-3 text-foreground">Order ID configuration</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prefix</Label>
                  <Inp placeholder="ORD" value={orderIdConfig.prefix || ''}
                    onChange={e => setOrderIdConfig(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label>Separator</Label>
                  <Inp placeholder="-" value={orderIdConfig.separator || '-'}
                    onChange={e => setOrderIdConfig(p => ({ ...p, separator: e.target.value }))} />
                </div>
                <div>
                  <Label>Number digits</Label>
                  <Inp type="number" min={1} max={8} value={orderIdConfig.digits || 4}
                    onChange={e => setOrderIdConfig(p => ({ ...p, digits: +e.target.value }))} />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={orderIdConfig.includeYear !== false}
                      onChange={e => setOrderIdConfig(p => ({ ...p, includeYear: e.target.checked }))} />
                    <span className="text-muted-foreground">Include year (e.g. 2026)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={orderIdConfig.resetYearly !== false}
                      onChange={e => setOrderIdConfig(p => ({ ...p, resetYearly: e.target.checked }))} />
                    <span className="text-muted-foreground">Reset counter each year</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Line Item ID config */}
            <div>
              <div className="text-[11px] font-bold mb-3 text-foreground">Line Item ID configuration</div>
              <label className="flex items-center gap-2 text-xs cursor-pointer mb-3">
                <input type="checkbox" checked={lineItemConfig.enabled !== false}
                  onChange={e => setLineItemConfig(p => ({ ...p, enabled: e.target.checked }))} />
                <span className="text-muted-foreground">Enable multi-line items (one flow per item)</span>
              </label>
              {lineItemConfig.enabled !== false && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Prefix</Label>
                    <Inp placeholder="ITEM" value={lineItemConfig.prefix || ''}
                      onChange={e => setLineItemConfig(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <Label>Separator</Label>
                    <Inp placeholder="-" value={lineItemConfig.separator || '-'}
                      onChange={e => setLineItemConfig(p => ({ ...p, separator: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Digits</Label>
                    <Inp type="number" min={1} max={6} value={lineItemConfig.digits || 3}
                      onChange={e => setLineItemConfig(p => ({ ...p, digits: +e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg flex items-center gap-2 text-[11px] text-red-600 flex-shrink-0">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Order entry modal */}
      {showEntry && existingForm && (
        <OrderEntryModal
          form={existingForm}
          tenantId={tenantId}
          onClose={() => setShowEntry(false)}
          onSubmitted={() => {
            setShowEntry(false);
          }}
        />
      )}
    </div>
  );
}