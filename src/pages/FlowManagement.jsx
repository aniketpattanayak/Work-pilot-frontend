import { useState } from 'react';
import FlowBuilder      from './FlowBuilder';
import FlowMonitor      from './FlowMonitor';
import DataSourceWizard from './DataSourceWizard';
import { ArrowLeft }    from 'lucide-react';

export default function FlowManagement({ tenantId, user }) {
  // views: 'monitor' | 'wizard' | 'builder'
  const FLOW_DRAFT_KEY = `wp_new_flow_draft_${tenantId || 'default'}`;

  const [view, setView]           = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(`wp_new_flow_draft_${tenantId || 'default'}`) || '{}');
      if (d.view === 'builder' && d.wizardResult) return 'builder';
      if (d.view === 'wizard') return 'wizard';
    } catch {}
    return 'monitor';
  });
  const [activeTab, setActiveTab] = useState('canvas');
  const [wizardResult, setWizardResult] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(`wp_new_flow_draft_${tenantId || 'default'}`) || '{}');
      return d.wizardResult || null;
    } catch { return null; }
  });
  const [editingTemplate, setEditingTemplate] = useState(null); // template being edited
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(`wp_new_flow_draft_${tenantId || 'default'}`) || '{}');
      return !!(d.view && d.view !== 'monitor');
    } catch { return false; }
  });

  const barStyle = {
    position:'fixed', top:80, left:260, right:0, height:45, zIndex:51,
    display:'flex', alignItems:'center', gap:10, padding:'0 16px',
    borderBottom:'1px solid var(--color-border)', background:'var(--color-card)',
  };
  const tabBtn = (id, label) => ({
    padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:600,
    border:'1px solid var(--color-border)', cursor:'pointer',
    background: activeTab===id ? 'var(--color-primary)' : 'var(--color-card)',
    color:      activeTab===id ? 'white' : 'var(--color-muted-foreground)',
  });

  // ── WIZARD ──────────────────────────────────────────────────────────────────
  // Handle editing an existing flow — skip wizard, go straight to builder
  const handleEditFlow = (template) => {
    setEditingTemplate(template);
    setWizardResult({
      flowName:    template.name,
      dataSource:  template.dataSource || 'sheet',
      config: {
        googleSheetId:  template.googleSheetId || '',
        scriptUrl:      template.scriptUrl || '',
        tabName:        template.tabName || '',
        uniqueIdColumn: template.uniqueIdColumn || '',
        formId:         template.linkedFormId || '',
        webhookToken:   template.webhookToken || '',
      },
      fieldMap: {
        uniqueIdColumn: template.uniqueIdColumn || '',
        deadlineColumn: template.deadlineColumn || '',
        assignColumn:   template.assignColumn || '',
        openHour:  template.workingHours?.open  ?? 9,
        closeHour: template.workingHours?.close ?? 18,
      },
      linkedFormId:       template.linkedFormId || '',
      existingTemplateId: template._id,
      existingNodes:      template.nodes || [],  // pass nodes directly — no extra API call needed
    });
    setActiveTab('canvas');
    setView('builder');
  };

  if (view === 'wizard') return (
    <div style={{ position:'fixed', top:80, left:260, right:0, bottom:0, zIndex:50, overflowY:'auto', background:'var(--color-background)' }}>
      <DataSourceWizard
        tenantId={tenantId}
        onCancel={() => setView('monitor')}
        onComplete={(result) => {
          setWizardResult(result);
          setActiveTab('canvas');
          setView('builder');
          setHasDraft(true);
          try { localStorage.setItem(FLOW_DRAFT_KEY, JSON.stringify({ view: 'builder', wizardResult: result, savedAt: Date.now() })); } catch {}
        }}
      />
    </div>
  );

  // ── BUILDER ─────────────────────────────────────────────────────────────────
  if (view === 'builder') return (
    <>
      <div style={barStyle}>
        <button onClick={() => setView('monitor')}
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--color-muted-foreground)', background:'none', border:'none', cursor:'pointer' }}>
          <ArrowLeft size={14} /> Back to monitor
        </button>
        <span style={{ color:'var(--color-muted-foreground)' }}>/</span>
        <span style={{ fontSize:13, fontWeight:600 }}>
          {wizardResult?.flowName || 'New flow'}
        </span>
        {/* Data source badge */}
        {wizardResult?.dataSource && (
          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--color-muted)', color:'var(--color-muted-foreground)', border:'1px solid var(--color-border)' }}>
            {wizardResult.dataSource === 'form'    ? '📋 Form'
           : wizardResult.dataSource === 'sheet'   ? '📊 Sheet'
           : wizardResult.dataSource === 'webhook' ? '🔗 Webhook'
           : wizardResult.dataSource}
          </span>
        )}
        {/* Tab switcher */}
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          <button style={tabBtn('canvas', '🗂')} onClick={() => setActiveTab('canvas')}>🗂 Flow Canvas</button>
          <button style={tabBtn('form',   '📋')} onClick={() => setActiveTab('form')}>📋 Order Form</button>
        </div>
      </div>

      {activeTab === 'canvas' && (
        <FlowBuilder
          tenantId={tenantId}
          wizardConfig={wizardResult}
          onFlowSaved={() => {
            try { localStorage.removeItem(FLOW_DRAFT_KEY); } catch {}
            setWizardResult(null);
            setHasDraft(false);
            setView('monitor');
          }}
        />
      )}

      {activeTab === 'form' && (
        <div style={{ position:'fixed', top:125, left:260, right:0, bottom:0, zIndex:50, background:'var(--color-card)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
          <div style={{ fontSize:40 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--color-foreground)' }}>Order Forms have moved</div>
          <div style={{ fontSize:13, color:'var(--color-muted-foreground)', textAlign:'center', maxWidth:420, lineHeight:1.7 }}>
            Order Forms are now managed separately from the flow builder.<br/>
            Go to <strong>Order Forms</strong> in the sidebar to create and manage your forms.<br/>
            Then when building a flow, pick <strong>WorkPilot Form</strong> in the Data Source wizard and select your form.
          </div>
          <a href="/dashboard/order-forms"
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', fontSize:13, fontWeight:600, background:'var(--color-primary)', color:'white', borderRadius:10, textDecoration:'none', marginTop:8 }}>
            → Go to Order Forms
          </a>
        </div>
      )}
    </>
  );

  // ── MONITOR ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Draft resume banner */}
      {hasDraft && wizardResult && (
        <div style={{ margin:'16px 20px 0', padding:'12px 16px', background:'#FAEEDA', border:'1px solid #EFB470', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>📝</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#412402' }}>
                You have an unsaved flow draft — "{wizardResult.flowName}"
              </div>
              <div style={{ fontSize:11, color:'#854F0B', marginTop:2 }}>
                {wizardResult.dataSource === 'form' ? '📋 Form' : wizardResult.dataSource === 'sheet' ? '📊 Sheet' : '🔗 Webhook'} · Last edited {(() => {
                  try {
                    const d = JSON.parse(localStorage.getItem(FLOW_DRAFT_KEY) || '{}');
                    if (d.savedAt) return new Date(d.savedAt).toLocaleString([], { dateStyle:'short', timeStyle:'short' });
                  } catch {}
                  return '';
                })()}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setView('builder'); setActiveTab('canvas'); }}
              style={{ padding:'7px 16px', fontSize:12, fontWeight:700, background:'#854F0B', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>
              Resume draft →
            </button>
            <button onClick={() => {
              if (window.confirm('Discard this draft?')) {
                try { localStorage.removeItem(FLOW_DRAFT_KEY); } catch {}
                setWizardResult(null); setHasDraft(false);
              }
            }}
              style={{ padding:'7px 12px', fontSize:12, background:'transparent', border:'1px solid #EFB470', borderRadius:8, cursor:'pointer', color:'#854F0B' }}>
              Discard
            </button>
          </div>
        </div>
      )}
      <FlowMonitor
        tenantId={tenantId}
        onCreateFlow={() => { setWizardResult(null); setEditingTemplate(null); setHasDraft(false); try { localStorage.removeItem(FLOW_DRAFT_KEY); } catch {} setView('wizard'); }}
        onEditFlow={handleEditFlow}
      />
    </div>
  );
}