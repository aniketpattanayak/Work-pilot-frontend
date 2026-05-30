import { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import {
  ArrowRight, ArrowLeft, Copy, Check, RefreshCcw,
  FileText, Table2, Webhook, Zap, Building2, Plug,
  Info, AlertTriangle, CheckCircle2, ExternalLink
} from 'lucide-react';

// ─── DATA SOURCES ─────────────────────────────────────────────────────────────
const SOURCES = [
  {
    id: 'form',
    label: 'WorkPilot Form',
    icon: FileText,
    desc: 'Your team fills an internal form to create orders. Auto-generates Order IDs.',
    status: 'live',
    flow: ['Employee fills form', 'Auto ID generated', 'Flow starts'],
    color: '#185FA5', bg: '#E6F1FB',
  },
  {
    id: 'sheet',
    label: 'Google Sheet',
    icon: Table2,
    desc: 'New row in your Google Sheet triggers the flow via Apps Script.',
    status: 'live',
    flow: ['New sheet row added', 'Apps Script pushes', 'Flow starts'],
    color: '#0F6E56', bg: '#E1F5EE',
  },
  {
    id: 'webhook',
    label: 'Webhook / API',
    icon: Webhook,
    desc: 'Any external system (Zoho, Salesforce, Tally, ERP) POSTs an order to trigger this flow.',
    status: 'live',
    flow: ['External system POSTs', 'WorkPilot receives', 'Flow starts'],
    color: '#3C3489', bg: '#EEEDFE',
  },
  {
    id: 'zoho',
    label: 'Zoho CRM',
    icon: Building2,
    desc: 'New deal or sales order in Zoho auto-syncs to WorkPilot.',
    status: 'soon',
    flow: ['New Zoho deal', 'Auto sync', 'Flow starts'],
    color: '#854F0B', bg: '#FAEEDA',
  },
  {
    id: 'zapier',
    label: 'Zapier / Make',
    icon: Plug,
    desc: 'Connect 5000+ apps via Zapier or Make.com to trigger flows.',
    status: 'soon',
    flow: ['App event fires', 'Zapier sends', 'Flow starts'],
    color: '#993C1D', bg: '#FAECE7',
  },
];

// ─── TINY UI HELPERS ──────────────────────────────────────────────────────────
const Lbl = ({ ch }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-muted-foreground)', marginBottom: 5 }}>{ch}</div>
);
const Inp = (p) => (
  <input style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)', outline: 'none' }} {...p} />
);
const Sel = ({ children, ...p }) => (
  <select style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)', outline: 'none' }} {...p}>{children}</select>
);
const InfoBox = ({ children, type = 'info' }) => {
  const colors = {
    info:    { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
    warn:    { bg: '#FAEEDA', border: '#854F0B', text: '#412402' },
    success: { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  };
  const c = colors[type];
  return (
    <div style={{ background: c.bg, borderLeft: `2px solid ${c.border}`, borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: c.text, lineHeight: 1.65, margin: '10px 0' }}>
      {children}
    </div>
  );
};

// ─── STEP BAR ─────────────────────────────────────────────────────────────────
function StepBar({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#185FA5' : 'var(--color-border)' }} />
      ))}
    </div>
  );
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 7, background: 'var(--color-card)', cursor: 'pointer', color: copied ? '#27500A' : 'var(--color-muted-foreground)' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── FLOW PREVIEW ─────────────────────────────────────────────────────────────
function FlowPreview({ steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}>{s}</span>
          {i < steps.length - 1 && <ArrowRight size={12} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN WIZARD ─────────────────────────────────────────────────────────────
export default function DataSourceWizard({ tenantId, onComplete, onCancel }) {
  const [step, setStep]           = useState(0);
  const [source, setSource]       = useState(null);
  const [config, setConfig]       = useState({});   // step 2 config values
  const [fieldMap, setFieldMap]   = useState({});   // step 3 field mapping
  const [forms, setForms]         = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting]     = useState(false);
  const [sheetCols, setSheetCols] = useState([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [flowName, setFlowName]   = useState('');

  const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api.lrbcloud.ai/api'
    : 'http://localhost:5000/api';

  // Load order forms for 'form' source
  useEffect(() => {
    if (source?.id !== 'form' || !tenantId) return;
    setLoadingForms(true);
    API.get(`/fms2/forms/${tenantId}`)
      .then(r => setForms(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingForms(false));
  }, [source, tenantId]);

  // Load sheet columns when sheet config is ready
  const loadSheetCols = async () => {
    if (!config.scriptUrl || !config.googleSheetId) return;
    setLoadingCols(true);
    try {
      const r = await fetch(`${config.scriptUrl}?operation=readSheet&sheetId=${config.googleSheetId}&tabName=${encodeURIComponent(config.tabName || 'Sheet1')}&limit=1`);
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        setSheetCols(Object.keys(data[0]));
      }
    } catch (e) {} finally { setLoadingCols(false); }
  };

  // Test webhook endpoint
  const testWebhook = async () => {
    setTesting(true); setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/fms2/webhook-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId }),
      });
      const d = await r.json();
      setTestResult({ ok: r.ok, message: d.message || 'Webhook endpoint is reachable' });
    } catch (e) {
      setTestResult({ ok: false, message: 'Could not reach endpoint. Check your server.' });
    } finally { setTesting(false); }
  };

  const canProceedStep1 = () => {
    if (!source) return false;
    if (source.status === 'soon') return false;
    if (!flowName.trim()) return false;
    return true;
  };

  const canProceedStep2 = () => {
    if (!source) return false;
    if (source.id === 'form')    return true; // form optional
    if (source.id === 'sheet')   return !!(config.googleSheetId && config.scriptUrl);
    if (source.id === 'webhook') return true;
    return false;
  };

  const handleFinish = () => {
    onComplete({
      dataSource:  source.id,
      flowName:    flowName.trim(),
      config:      config,
      fieldMap:    fieldMap,
      linkedFormId: config.formId || null,
    });
  };

  const webhookUrl = `${API_BASE}/fms2/push-sync`;
  const templateIdPlaceholder = 'TEMPLATE_ID_AFTER_DEPLOY';

  // ── STEP 0: Choose data source ─────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <StepBar step={0} />
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Where will orders come from?</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 20 }}>
        Every flow needs a data source — the place where new orders arrive. Choose one for this flow.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
        {SOURCES.map(src => {
          const Icon = src.icon;
          const sel  = source?.id === src.id;
          return (
            <div key={src.id} onClick={() => src.status !== 'soon' && setSource(src)}
              style={{ border: `1.5px solid ${sel ? src.color : 'var(--color-border)'}`, borderRadius: 12, padding: 16, cursor: src.status === 'soon' ? 'not-allowed' : 'pointer', background: sel ? src.bg : 'var(--color-card)', opacity: src.status === 'soon' ? 0.6 : 1, transition: 'all .15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: sel ? 'rgba(255,255,255,0.6)' : 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: sel ? src.color : 'var(--color-muted-foreground)' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: src.status === 'live' ? '#EAF3DE' : '#F1EFE8', color: src.status === 'live' ? '#27500A' : '#444441' }}>
                  {src.status === 'live' ? 'Available' : 'Coming soon'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: sel ? src.color : 'var(--color-foreground)' }}>{src.label}</div>
              <div style={{ fontSize: 11, color: sel ? src.color : 'var(--color-muted-foreground)', lineHeight: 1.55 }}>{src.desc}</div>
              {sel && <FlowPreview steps={src.flow} />}
            </div>
          );
        })}
      </div>

      {source && source.status !== 'soon' && (
        <div style={{ marginBottom: 16 }}>
          <Lbl ch="Flow name *" />
          <Inp placeholder={`e.g. Navtech ${source.label} Order Flow`} value={flowName} onChange={e => setFlowName(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <button onClick={onCancel} style={{ padding: '8px 18px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
          Cancel
        </button>
        <button onClick={() => setStep(1)} disabled={!canProceedStep1()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, background: canProceedStep1() ? '#185FA5' : 'var(--color-muted)', color: 'white', border: 'none', borderRadius: 8, cursor: canProceedStep1() ? 'pointer' : 'not-allowed' }}>
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  // ── STEP 1: Configure the source ───────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <StepBar step={1} />
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Configure {source.label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.6 }}>
        {source.id === 'form'    && 'Choose an existing order form or create a new one. The form collects order data from your team.'}
        {source.id === 'sheet'   && 'Connect your Google Sheet. WorkPilot reads it (never writes back). New rows trigger this flow.'}
        {source.id === 'webhook' && 'Your WorkPilot webhook endpoint is ready. Copy it into your ERP, Zoho, or any system that supports webhooks.'}
      </div>

      {/* FORM */}
      {source.id === 'form' && (
        <div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <Lbl ch="Select an existing order form (optional)" />
            {loadingForms ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                <RefreshCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading forms…
              </div>
            ) : (
              <Sel value={config.formId || ''} onChange={e => setConfig(p => ({ ...p, formId: e.target.value }))}>
                <option value="">— No form yet (I will create one in the Form tab) —</option>
                {forms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
              </Sel>
            )}
          </div>
          <InfoBox type="info">
            <strong>How it works:</strong> When an employee submits the form, WorkPilot auto-generates the Order ID and one Line Item ID per line item. Each line item starts this flow automatically — no sheet or external tool needed.
          </InfoBox>
          {!config.formId && (
            <InfoBox type="warn">
              You can leave this blank and create a form later in the <strong>📋 Order Form</strong> tab inside the Flow Builder.
            </InfoBox>
          )}
        </div>
      )}

      {/* SHEET */}
      {source.id === 'sheet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <Lbl ch="Google Sheet ID *" />
              <Inp placeholder="Paste from sheet URL e.g. 1P68g6eLPNy5xxF_msma…" value={config.googleSheetId || ''}
                onChange={e => setConfig(p => ({ ...p, googleSheetId: e.target.value.trim() }))} />
              <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>Found in your sheet URL: docs.google.com/spreadsheets/d/<strong>THIS PART</strong>/edit</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Lbl ch="Apps Script Web App URL *" />
              <Inp placeholder="https://script.google.com/macros/s/…/exec" value={config.scriptUrl || ''}
                onChange={e => setConfig(p => ({ ...p, scriptUrl: e.target.value.trim() }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <Lbl ch="Tab name" />
                <Inp placeholder="Order Capture" value={config.tabName || ''}
                  onChange={e => setConfig(p => ({ ...p, tabName: e.target.value }))} />
              </div>
              <div>
                <Lbl ch="Unique ID column" />
                <Inp placeholder="Line Item ID" value={config.uniqueIdColumn || ''}
                  onChange={e => setConfig(p => ({ ...p, uniqueIdColumn: e.target.value }))} />
              </div>
            </div>
            <button onClick={loadSheetCols} disabled={!config.googleSheetId || !config.scriptUrl || loadingCols}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-card)', cursor: 'pointer', opacity: (!config.googleSheetId || !config.scriptUrl) ? 0.5 : 1 }}>
              {loadingCols ? <RefreshCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={12} />}
              {sheetCols.length ? `${sheetCols.length} columns loaded ✓` : 'Load sheet columns'}
            </button>
          </div>
          <InfoBox type="info">
            WorkPilot <strong>never writes back to your sheet</strong>. It reads row data once when a new row is added and stores it in its own database. All step tracking happens in WorkPilot.
          </InfoBox>
        </div>
      )}

      {/* WEBHOOK */}
      {source.id === 'webhook' && (
        <div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <Lbl ch="Your WorkPilot webhook endpoint" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <code style={{ flex: 1, fontSize: 12, background: 'var(--color-muted)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}>
                POST {webhookUrl}
              </code>
              <CopyBtn text={`POST ${webhookUrl}`} />
            </div>

            <Lbl ch="Request body format (copy this)" />
            <div style={{ position: 'relative' }}>
              <pre style={{ fontSize: 11, background: 'var(--color-muted)', padding: '10px 12px', borderRadius: 8, overflow: 'auto', color: 'var(--color-foreground)', border: '1px solid var(--color-border)', lineHeight: 1.6, margin: 0 }}>{`{
  "templateId": "${templateIdPlaceholder}",
  "rowData": {
    "Order ID":    "ORD-001",
    "Customer":    "Navtech",
    "Item":        "SS Ladle",
    "Qty":         500,
    "DeliveryDate":"2026-06-15"
  }
}`}</pre>
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <CopyBtn text={`{\n  "templateId": "YOUR_TEMPLATE_ID",\n  "rowData": {\n    "Order ID": "ORD-001",\n    "Customer": "Navtech",\n    "Item": "SS Ladle",\n    "Qty": 500\n  }\n}`} />
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <Lbl ch="Security — optional auth token" />
            <Inp placeholder="Leave blank to skip (or enter a secret token your ERP will send)" value={config.webhookToken || ''}
              onChange={e => setConfig(p => ({ ...p, webhookToken: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>
              If set, your ERP must send: <code style={{ background: 'var(--color-muted)', padding: '1px 5px', borderRadius: 4 }}>Authorization: Bearer YOUR_TOKEN</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <button onClick={testWebhook} disabled={testing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-card)', cursor: 'pointer' }}>
              {testing ? <RefreshCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
              Test endpoint
            </button>
            {testResult && (
              <span style={{ fontSize: 12, color: testResult.ok ? '#27500A' : '#A32D2D', display: 'flex', alignItems: 'center', gap: 5 }}>
                {testResult.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {testResult.message}
              </span>
            )}
          </div>

          <InfoBox type="info">
            <strong>How it works:</strong> Deploy this flow → copy the <code>templateId</code> from the success message → paste it into your ERP/Zoho/Salesforce webhook config. Every time that system fires the webhook, WorkPilot starts a new flow instance automatically.
          </InfoBox>
          <InfoBox type="warn">
            <strong>For Tally:</strong> Tally doesn't support outbound webhooks natively. Use a Tally ODBC export + a small script, or Zapier with a Tally plugin to bridge the gap.
          </InfoBox>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, marginTop: 8, borderTop: '1px solid var(--color-border)' }}>
        <button onClick={() => setStep(0)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => setStep(2)} disabled={!canProceedStep2()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, background: canProceedStep2() ? '#185FA5' : 'var(--color-muted)', color: 'white', border: 'none', borderRadius: 8, cursor: canProceedStep2() ? 'pointer' : 'not-allowed' }}>
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  // ── STEP 2: Field mapping ──────────────────────────────────────────────────
  const cols = sheetCols.length > 0 ? sheetCols : [];
  const colOptions = cols.map(c => <option key={c} value={c}>{c}</option>);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <StepBar step={2} />
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Map your data fields</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 20, lineHeight: 1.6 }}>
        Tell WorkPilot which fields are used for tracking, deadlines, and auto-assignment in this flow. These are used by the flow engine when processing each order.
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}>

        {/* Unique ID */}
        <div>
          <Lbl ch="Order / Line Item ID field *" />
          {source.id === 'form' ? (
            <div style={{ padding: '8px 12px', background: 'var(--color-muted)', borderRadius: 8, fontSize: 12, color: 'var(--color-muted-foreground)' }}>
              Auto-generated by WorkPilot — no configuration needed
            </div>
          ) : cols.length > 0 ? (
            <Sel value={fieldMap.uniqueIdColumn || config.uniqueIdColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, uniqueIdColumn: e.target.value }))}>
              <option value="">Select column…</option>
              {colOptions}
            </Sel>
          ) : (
            <Inp placeholder="e.g. Line Item ID" value={fieldMap.uniqueIdColumn || config.uniqueIdColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, uniqueIdColumn: e.target.value }))} />
          )}
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>One flow instance is created per unique value in this field.</div>
        </div>

        {/* Deadline */}
        <div>
          <Lbl ch="Deadline / due date field" />
          {cols.length > 0 ? (
            <Sel value={fieldMap.deadlineColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, deadlineColumn: e.target.value }))}>
              <option value="">Not set (deadline configured per node)</option>
              {colOptions}
            </Sel>
          ) : (
            <Inp placeholder="e.g. Promise Date of Delivery (leave blank if not used)"
              value={fieldMap.deadlineColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, deadlineColumn: e.target.value }))} />
          )}
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>Used by T-N deadline mode (e.g. complete 2 days before this date).</div>
        </div>

        {/* Auto-assign */}
        <div>
          <Lbl ch="Auto-assign employee from field" />
          {cols.length > 0 ? (
            <Sel value={fieldMap.assignColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, assignColumn: e.target.value }))}>
              <option value="">Not set (fixed employee per node)</option>
              {colOptions}
            </Sel>
          ) : (
            <Inp placeholder="e.g. Employee Name (leave blank to set per node)"
              value={fieldMap.assignColumn || ''}
              onChange={e => setFieldMap(p => ({ ...p, assignColumn: e.target.value }))} />
          )}
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>If set, WorkPilot will look up the employee by name from this field and assign them automatically.</div>
        </div>

        {/* Working hours */}
        <div>
          <Lbl ch="Working hours" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>Office opens (24hr)</div>
              <Inp type="number" min={0} max={23} placeholder="9" value={fieldMap.openHour ?? 9}
                onChange={e => setFieldMap(p => ({ ...p, openHour: +e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>Office closes (24hr)</div>
              <Inp type="number" min={0} max={23} placeholder="18" value={fieldMap.closeHour ?? 18}
                onChange={e => setFieldMap(p => ({ ...p, closeHour: +e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary preview */}
      <div style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-muted-foreground)', marginBottom: 10 }}>Flow summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {[
            ['Name', flowName],
            ['Data source', source.label],
            ['Order ID', source.id === 'form' ? 'Auto-generated' : (fieldMap.uniqueIdColumn || config.uniqueIdColumn || 'Not set')],
            ['Deadline field', fieldMap.deadlineColumn || 'Set per node'],
            ['Auto-assign from', fieldMap.assignColumn || 'Set per node'],
            ['Working hours', `${fieldMap.openHour ?? 9}:00 – ${fieldMap.closeHour ?? 18}:00`],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ color: 'var(--color-muted-foreground)' }}>{k}: </span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={handleFinish}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', fontSize: 13, fontWeight: 600, background: '#185FA5', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Build the flow <ArrowRight size={14} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}