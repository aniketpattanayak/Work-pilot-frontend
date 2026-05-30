import { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import {
  Plus, Trash2, RefreshCcw, AlertCircle, CheckCircle2,
  ChevronDown, Package, FileText, ArrowLeft, Link2, Copy, Check, ExternalLink
} from 'lucide-react';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const Lbl = ({ ch, required }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: 5 }}>
    {ch}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </div>
);

function FieldInput({ field, value, onChange }) {
  if (field.type === 'textarea') return (
    <textarea
      placeholder={field.placeholder || ''}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
    />
  );
  if (field.type === 'dropdown') return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
      <option value="">Select…</option>
      {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (field.type === 'date') return (
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
  );
  if (field.type === 'number') return (
    <input type="number" placeholder={field.placeholder || '0'} value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
  );
  return (
    <input type="text" placeholder={field.placeholder || ''} value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
function SuccessScreen({ result, onNewOrder }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <CheckCircle2 size={36} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-black mb-2">Order Submitted!</h2>
      <div className="text-3xl font-black text-primary mb-1">{result.orderId}</div>
      <p className="text-sm text-muted-foreground mb-6">
        {result.lineItems?.length} line item{result.lineItems?.length !== 1 ? 's' : ''} created — flows started automatically
      </p>

      {/* Line item IDs */}
      <div className="w-full max-w-sm bg-muted rounded-xl p-4 mb-6 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Line Item IDs</div>
        <div className="space-y-2">
          {result.lineItems?.map((item, i) => (
            <div key={i} className="font-mono text-sm bg-background border border-border rounded-lg px-3 py-2">
              {item.lineItemId}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onNewOrder}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">
          <Plus size={15} /> Submit Another Order
        </button>
      </div>
    </div>
  );
}


// ─── COPY LINK BUTTON ─────────────────────────────────────────────────────────
function CopyLinkBtn({ formId }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/dashboard/new-order?formId=${formId}`;

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-all">
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button onClick={(e) => { e.stopPropagation(); window.open(`${window.location.origin}/dashboard/new-order?formId=${formId}`, '_blank'); }}
        className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
        title="Open in new tab">
        <ExternalLink size={12} />
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function NewOrderPage({ tenantId }) {
  const [forms, setForms]           = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loadingForms, setLoadingForms] = useState(true);
  const [showFormPicker, setShowFormPicker] = useState(false);

  // Form values
  const [orderValues, setOrderValues]   = useState({});
  const [lineItems, setLineItems]       = useState([{ id: Date.now(), values: {} }]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(null);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Load all forms for this tenant
  const fetchForms = useCallback(async () => {
    if (!tenantId) return;
    setLoadingForms(true);
    try {
      const r = await API.get(`/fms2/forms/${tenantId}`);
      const list = Array.isArray(r.data) ? r.data : [];
      setForms(list);
      // Check if URL has a formId param — open that form directly
      const params = new URLSearchParams(window.location.search);
      const fid = params.get('formId');
      if (fid) {
        const match = list.find(f => f._id === fid);
        if (match) setSelectedForm(match);
      }
    } catch { setForms([]); }
    finally { setLoadingForms(false); }
  }, [tenantId]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  // Reset form when selectedForm changes
  useEffect(() => {
    setOrderValues({});
    setLineItems([{ id: Date.now(), values: {} }]);
    setError('');
  }, [selectedForm?._id]);

  const addLineItem = () => setLineItems(p => [...p, { id: Date.now(), values: {} }]);
  const removeLineItem = (id) => setLineItems(p => p.filter(l => l.id !== id));
  const updateLineItem = (id, label, val) =>
    setLineItems(p => p.map(l => l.id === id ? { ...l, values: { ...l.values, [label]: val } } : l));

  const handleSubmit = async () => {
    setError('');

    // Validate required order fields
    for (const f of (selectedForm?.orderFields || [])) {
      if (f.required && !orderValues[f.label]?.toString().trim()) {
        setError(`"${f.label}" is required`); return;
      }
    }
    // Validate required item fields
    for (let i = 0; i < lineItems.length; i++) {
      for (const f of (selectedForm?.itemFields || [])) {
        if (f.required && !lineItems[i].values[f.label]?.toString().trim()) {
          setError(`"${f.label}" is required for line item ${i + 1}`); return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await API.post('/fms2/forms/submit', {
        formId:           selectedForm._id,
        orderFieldValues: orderValues,
        lineItems:        lineItems.map(l => ({ fieldValues: l.values })),
      });
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleNewOrder = () => {
    setSuccess(null);
    setOrderValues({});
    setLineItems([{ id: Date.now(), values: {} }]);
    setError('');
  };

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loadingForms) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
      <RefreshCcw size={28} className="animate-spin" />
      <p className="text-sm">Loading forms…</p>
    </div>
  );

  // ── NO FORMS ─────────────────────────────────────────────────────────────────
  if (forms.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <FileText size={48} className="text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-black mb-2">No order forms available</h2>
      <p className="text-sm text-muted-foreground">Ask your admin to create an order form first.</p>
    </div>
  );

  // ── SUCCESS ───────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      <SuccessScreen result={success} onNewOrder={handleNewOrder} />
    </div>
  );

  // ── FORM PICKER — always shown first ─────────────────────────────────────────
  if (!selectedForm) return (
    <div className="w-full max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">New Order</h1>
          <p className="text-sm text-muted-foreground">Select the form to fill and submit an order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {forms.map(form => {
          const cfg     = form.orderIdConfig || {};
          const sep     = cfg.separator || '-';
          const yr      = new Date().getFullYear();
          const preview = [cfg.prefix || 'ORD', cfg.includeYear !== false ? yr : null, '0001'].filter(Boolean).join(sep);
          const oCount  = (form.orderFields || []).filter(f => f.label).length;
          const iCount  = (form.itemFields  || []).filter(f => f.label).length;

          return (
            <div key={form._id}
              className="border border-border rounded-2xl bg-card hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden">
              {/* Clickable main area */}
              <button onClick={() => setSelectedForm(form)}
                className="w-full text-left p-5 pb-3">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-1">{form.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {oCount} order field{oCount !== 1 ? 's' : ''} · {iCount} line item field{iCount !== 1 ? 's' : ''}
                    </div>
                    <div className="mt-2">
                      <code className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">{preview}</code>
                    </div>
                  </div>
                </div>
                <div className="mt-4 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold text-center group-hover:bg-primary group-hover:text-white transition-all">
                  Fill & Submit →
                </div>
              </button>

              {/* Share link row */}
              <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Link2 size={11} />
                  Shareable link
                </div>
                <CopyLinkBtn formId={form._id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ORDER ENTRY FORM ──────────────────────────────────────────────────────────
  const orderFields = (selectedForm.orderFields || []).filter(f => f.label);
  const itemFields  = (selectedForm.itemFields  || []).filter(f => f.label);

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setSelectedForm(null)}
          className="p-2 rounded-lg hover:bg-muted transition">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight">{selectedForm.name}</h1>
            <p className="text-xs text-muted-foreground">Fill in order details and line items</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* ORDER-LEVEL FIELDS */}
        {orderFields.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Order Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orderFields.map(field => (
                <div key={field.id}
                  className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <Lbl ch={field.label} required={field.required} />
                  <FieldInput
                    field={field}
                    value={orderValues[field.label]}
                    onChange={val => setOrderValues(p => ({ ...p, [field.label]: val }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LINE ITEMS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Line Items ({lineItems.length})
            </div>
            <button onClick={addLineItem}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              <Plus size={13} /> Add item
            </button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, idx) => (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Item {idx + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {itemFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {itemFields.map(field => (
                      <div key={field.id}
                        className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                        <Lbl ch={field.label} required={field.required} />
                        <FieldInput
                          field={field}
                          value={item.values[field.label]}
                          onChange={val => updateLineItem(item.id, field.label, val)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No line item fields configured.</p>
                )}
              </div>
            ))}
          </div>

          {/* Add item button at bottom */}
          <button onClick={addLineItem}
            className="w-full mt-3 py-3 border border-dashed border-border rounded-2xl text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition flex items-center justify-center gap-2">
            <Plus size={15} /> Add another line item
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pb-6">
          <button onClick={() => {
            // Validate first, then show confirm
            for (const f of (selectedForm?.orderFields || [])) {
              if (f.required && !orderValues[f.label]?.toString().trim()) { setError(`"${f.label}" is required`); return; }
            }
            for (let i = 0; i < lineItems.length; i++) {
              for (const f of (selectedForm?.itemFields || [])) {
                if (f.required && !lineItems[i].values[f.label]?.toString().trim()) { setError(`"${f.label}" is required for line item ${i + 1}`); return; }
              }
            }
            setError('');
            setShowConfirm(true);
          }} disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-primary/20">
            <Package size={15} /> Review & Submit
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="text-lg font-bold mb-1">Confirm Order Submission</div>
              <div className="text-sm text-muted-foreground mb-4">Please review before submitting. This cannot be undone.</div>

              {/* Order summary */}
              <div className="bg-muted rounded-xl p-4 mb-4 space-y-2 text-sm max-h-64 overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Order Details</div>
                {(selectedForm?.orderFields || []).filter(f => f.label && orderValues[f.label]).map(f => (
                  <div key={f.id} className="flex justify-between gap-4">
                    <span className="text-muted-foreground flex-shrink-0">{f.label}</span>
                    <span className="font-medium text-right">{orderValues[f.label]}</span>
                  </div>
                ))}
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-2">{lineItems.length} Line Item{lineItems.length !== 1 ? 's' : ''}</div>
                {lineItems.map((item, i) => (
                  <div key={item.id} className="border border-border rounded-lg p-2">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1">Item {i + 1}</div>
                    {(selectedForm?.itemFields || []).filter(f => f.label && item.values[f.label]).map(f => (
                      <div key={f.id} className="flex justify-between gap-4 text-xs">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{item.values[f.label]}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition">
                  Go back & edit
                </button>
                <button onClick={() => { setShowConfirm(false); handleSubmit(); }} disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><RefreshCcw size={13} className="animate-spin" /> Submitting…</> : <><Package size={13} /> Confirm Submit</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}