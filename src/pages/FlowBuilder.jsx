import { useState, useRef, useCallback, useEffect } from 'react';
import API from '../api/axiosConfig';
import {
  Plus, Trash2, Save, X, Settings, Zap,
  GitBranch, Link2, RefreshCcw, AlertCircle, MousePointer2,
  CheckCircle2, ArrowRight
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const NODE_W = 172;
const NODE_TYPES = [
  { type: 'start',  label: 'Start',         color: '#475569', bg: '#f8fafc', border: '#94a3b8' },
  { type: 'action', label: 'Action',         color: '#0c447c', bg: '#e6f1fb', border: '#185fa5' },
  { type: 'yesno',  label: 'Yes / No gate',  color: '#412402', bg: '#faeeda', border: '#854f0b' },
  { type: 'input',  label: 'Input collect',  color: '#27500a', bg: '#eaf3de', border: '#3b6d11' },
  { type: 'end',    label: 'End',            color: '#3c3489', bg: '#eeedfe', border: '#534ab7' },
];
const DEADLINE_MODES = [
  { value: 'wwh',      label: 'T+N — within working hours' },
  { value: 'wwh2',     label: 'T+N — trigger outside hours' },
  { value: 'days',     label: 'T+N working days' },
  { value: 'lead',     label: 'T-N days before date column' },
  { value: 'specific', label: 'Fixed time of day, N days after' },
];
const INPUT_TYPES = ['text', 'number', 'dropdown', 'date', 'checkbox'];

function uid() { return 'n_' + Math.random().toString(36).slice(2, 9); }
function fid() { return 'f_' + Math.random().toString(36).slice(2, 9); }
function ns(type) { return NODE_TYPES.find(t => t.type === type) || NODE_TYPES[1]; }

function outputPorts(node) {
  const cx = node.position.x + NODE_W / 2;
  const bottom = node.position.y + nodeHeight(node);
  if (node.type === 'yesno') return [
    { id: 'no',   x: node.position.x + 40,         y: bottom, label: 'No',  color: '#a32d2d', bg: '#fee2e2' },
    { id: 'yes',  x: node.position.x + NODE_W - 40, y: bottom, label: 'Yes', color: '#166534', bg: '#dcfce7' },
  ];
  if (node.type === 'end') return [];
  return [{ id: 'next', x: cx, y: bottom, label: null, color: '#64748b', bg: '#e2e8f0' }];
}

function inputPortPos(node) {
  return { x: node.position.x + NODE_W / 2, y: node.position.y };
}

function nodeHeight(node) {
  let h = 58;
  if (node.type !== 'start' && node.type !== 'end') {
    if (node.assignedTo?.value)       h += 16;
    if (node.deadline?.mode)          h += 16;
    if (node.inputFields?.length > 0) h += 16;
  }
  return h;
}

function bezier(x1, y1, x2, y2) {
  const dy = Math.abs(y2 - y1);
  const cp = Math.max(60, dy * 0.55);
  return `M${x1},${y1} C${x1},${y1 + cp} ${x2},${y2 - cp} ${x2},${y2}`;
}

// ─── SMALL UI COMPONENTS ──────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{children}</label>
);
const Inp = (p) => (
  <input className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" {...p} />
);
const Sel = ({ children, ...p }) => (
  <select className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" {...p}>{children}</select>
);
const Sec = ({ title }) => (
  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-1.5 pb-1 border-b border-border">{title}</div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowBuilder({ tenantId, onFlowSaved }) {
  const svgRef    = useRef(null);
  const canvasRef = useRef(null);

  const [meta, setMeta] = useState({
    name: '', googleSheetId: '', scriptUrl: '', tabName: 'Sheet1',
    uniqueIdColumn: 'Order ID',
    workingHours: { open: 9, close: 18, workDays: [1,2,3,4,5] },
  });

  const [nodes, setNodes]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [connecting, setConnecting] = useState(null); // { fromNodeId, portId }
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 }); // for live preview line
  const [employees, setEmployees]   = useState([]);
  const [sheetCols, setSheetCols]   = useState([]);
  const [saving, setSaving]         = useState(false);
  const [loadingCols, setLoadingCols] = useState(false);
  const [error, setError]           = useState('');
  const [dragging, setDragging]     = useState(null);
  const justDragged = useRef(false);

  // ── Pan & Zoom ──────────────────────────────────────────────────────────────
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning       = useRef(false);
  const panStart        = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!tenantId) return;
    API.get(`/tasks/employees/${tenantId}`)
      .then(r => setEmployees(Array.isArray(r.data) ? r.data : r.data?.employees || []))
      .catch(() => {});
  }, [tenantId]);

  // ── Node CRUD ─────────────────────────────────────────────────────────────
  const addNode = useCallback((type) => {
    const id = uid();
    const i = nodes.length;
    setNodes(prev => [...prev, {
      id, name: NODE_TYPES.find(t => t.type === type)?.label || type, type,
      position: { x: 100 + (i % 3) * 220, y: 80 + Math.floor(i / 3) * 160 },
      assignedTo: { type: 'employee', value: '' },
      deadline: { mode: 'specific', value: 0, unit: 'hours', timeOfDay: 9, dateColumn: '' },
      sheetColumnsToShow: [], inputFields: [], question: '',
      nextNodeId: null, yesNextNodeId: null, noNextNodeId: null,
      notifyChannel: 'both',
    }]);
    setSelected(id);
  }, [nodes.length]);

  const deleteNode = useCallback((id) => {
    setNodes(prev => prev.filter(n => n.id !== id).map(n => ({
      ...n,
      nextNodeId:    n.nextNodeId    === id ? null : n.nextNodeId,
      yesNextNodeId: n.yesNextNodeId === id ? null : n.yesNextNodeId,
      noNextNodeId:  n.noNextNodeId  === id ? null : n.noNextNodeId,
    })));
    if (selected === id) setSelected(null);
  }, [selected]);

  const deleteConnection = useCallback((fromId, portId) => {
    const key = portId === 'yes' ? 'yesNextNodeId' : portId === 'no' ? 'noNextNodeId' : 'nextNodeId';
    setNodes(prev => prev.map(n => n.id === fromId ? { ...n, [key]: null } : n));
  }, []);

  const updateNode = useCallback((id, patch) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const updateNested = useCallback((id, key, patch) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [key]: { ...n[key], ...patch } } : n));
  }, []);

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e, nodeId) => {
    if (e.target.closest('.port') || e.target.closest('.node-btn')) return;
    e.preventDefault();
    e.stopPropagation(); // prevent canvas pan from starting
    isPanning.current = false; // cancel any pan that started
    const node = nodes.find(n => n.id === nodeId);
    setDragging({ nodeId, ox: e.clientX - node.position.x * zoom - pan.x, oy: e.clientY - node.position.y * zoom - pan.y });
    setSelected(nodeId);
    setConnecting(null);
  }, [nodes, zoom, pan]);

  const onCanvasPanStart = useCallback((e) => {
    // Pan on left/middle click — nodes call e.stopPropagation() to prevent this
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const onCanvasPanEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Mac trackpad support
  // - Two-finger swipe → always pans (left/right/up/down)
  // - Ctrl + scroll → zoom in/out
  // - Zoom buttons (+/-) → zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Ctrl+scroll = zoom only
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom(z => Math.min(2.5, Math.max(0.2, z * delta)));
    } else {
      // Everything else (two-finger swipe) = pan
      // deltaX = horizontal swipe, deltaY = vertical swipe
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const onMouseMove = useCallback((e) => {
    // Pan — fires when dragging canvas background (nodes stop propagation)
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }

    // Track mouse for live connection preview (account for pan+zoom)
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top  - pan.y) / zoom,
      });
    }
    if (!dragging) return;
    justDragged.current = true;
    updateNode(dragging.nodeId, {
      position: {
        x: Math.max(0, (e.clientX - dragging.ox - pan.x) / zoom),
        y: Math.max(0, (e.clientY - dragging.oy - pan.y) / zoom),
      }
    });
  }, [dragging, updateNode]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  // ── Connecting ──────────────────────────────────────────────────────────
  const onPortClick = useCallback((e, nodeId, portId) => {
    e.stopPropagation();
    if (!connecting) {
      setConnecting({ fromNodeId: nodeId, portId });
      setSelected(null);
    } else {
      if (connecting.fromNodeId === nodeId) { setConnecting(null); return; }
      const key = connecting.portId === 'yes' ? 'yesNextNodeId'
                : connecting.portId === 'no'  ? 'noNextNodeId'
                : 'nextNodeId';
      updateNode(connecting.fromNodeId, { [key]: nodeId });
      setConnecting(null);
    }
  }, [connecting, updateNode]);

  const onNodeClick = useCallback((e, nodeId) => {
    if (connecting && connecting.fromNodeId !== nodeId) {
      const key = connecting.portId === 'yes' ? 'yesNextNodeId'
                : connecting.portId === 'no'  ? 'noNextNodeId'
                : 'nextNodeId';
      updateNode(connecting.fromNodeId, { [key]: nodeId });
      setConnecting(null);
    } else {
      setSelected(nodeId);
    }
  }, [connecting, updateNode]);

  // ── Input fields ─────────────────────────────────────────────────────────
  const addField = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    updateNode(nodeId, { inputFields: [...(node.inputFields || []), { id: fid(), label: '', type: 'text', options: [], required: false }] });
  };
  const updateField = (nodeId, fieldId, patch) => {
    const node = nodes.find(n => n.id === nodeId);
    updateNode(nodeId, { inputFields: node.inputFields.map(f => f.id === fieldId ? { ...f, ...patch } : f) });
  };
  const deleteField = (nodeId, fieldId) => {
    const node = nodes.find(n => n.id === nodeId);
    updateNode(nodeId, { inputFields: node.inputFields.filter(f => f.id !== fieldId) });
  };

  // ── Sheet columns ─────────────────────────────────────────────────────────
  const loadCols = async () => {
    if (!meta.scriptUrl || !meta.googleSheetId) { setError('Enter Script URL and Sheet ID first'); return; }
    setLoadingCols(true); setError('');
    try {
      const r = await fetch(`${meta.scriptUrl}?operation=readSheet&sheetId=${meta.googleSheetId.trim()}&tabName=${encodeURIComponent(meta.tabName)}&limit=1`);
      const data = await r.json();
      if (Array.isArray(data) && data.length) setSheetCols(Object.keys(data[0]));
      else setError('No columns found. Check Sheet ID and tab name.');
    } catch { setError('Failed to read sheet. Check Script URL.'); }
    finally { setLoadingCols(false); }
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!meta.name || !meta.googleSheetId || !meta.scriptUrl) { setError('Fill in flow name, Sheet ID, and Script URL'); return; }
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) { setError('Add a Start node'); return; }

    setSaving(true);
    try {
      await API.post('/fms2/templates', {
        tenantId, ...meta,
        googleSheetId: meta.googleSheetId.trim(),
        scriptUrl: meta.scriptUrl.trim(),
        startNodeId: startNode.id,
        nodes: nodes.map(n => ({ ...n, sheetColumnsToShow: n.sheetColumnsToShow || [], inputFields: n.inputFields || [] })),
      });
      onFlowSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  // ── Build connections ─────────────────────────────────────────────────────
  const connections = [];
  nodes.forEach(n => {
    outputPorts(n).forEach(port => {
      const targetId = port.id === 'yes' ? n.yesNextNodeId : port.id === 'no' ? n.noNextNodeId : n.nextNodeId;
      if (!targetId) return;
      const target = nodes.find(t => t.id === targetId);
      if (!target) return;
      connections.push({ fromId: n.id, portId: port.id, from: port, to: inputPortPos(target), color: port.color });
    });
  });

  // Live preview: find source port position for the connecting line
  const previewFrom = connecting ? (() => {
    const fromNode = nodes.find(n => n.id === connecting.fromNodeId);
    if (!fromNode) return null;
    const port = outputPorts(fromNode).find(p => p.id === connecting.portId);
    return port;
  })() : null;

  const selNode = nodes.find(n => n.id === selected);

  return (
    <div style={{ position:'fixed', top:80, left:260, right:0, bottom:0, zIndex:50, display:'flex', flexDirection:'column', background:'var(--color-background)' }}>

      {/* Back to monitor bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 16px', borderBottom:'1px solid var(--color-border)', background:'var(--color-card)', height:44, flexShrink:0 }}>
        <button onClick={() => onFlowSaved?.()}
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--color-muted-foreground)', background:'none', border:'none', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color='var(--color-foreground)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--color-muted-foreground)'}>
          ← Back to monitor
        </button>
        <span style={{ color:'var(--color-muted-foreground)' }}>/</span>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)' }}>New flow</span>
      </div>

      {/* Main 3-column layout */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* ── LEFT PALETTE ── */}
        <div style={{ width:192, flexShrink:0, borderRight:'1px solid var(--color-border)', background:'var(--color-card)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-muted-foreground)' }}>Node palette</div>
            <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:2 }}>Click to add to canvas</div>
          </div>

          <div style={{ padding:8, flex:1, overflowY:'auto' }}>
            {NODE_TYPES.map(t => (
              <button key={t.type} onClick={() => addNode(t.type)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, border:'1px solid transparent', background:'transparent', cursor:'pointer', marginBottom:4, textAlign:'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <span style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, background:t.border }} />
                <span style={{ fontSize:12, fontWeight:600, color:t.color }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* How to connect */}
          {!connecting && (
            <div style={{ margin:8, padding:10, background:'var(--color-muted)', borderRadius:10, border:'1px solid var(--color-border)', fontSize:10, color:'var(--color-muted-foreground)', lineHeight:1.6 }}>
              <div style={{ fontWeight:700, color:'var(--color-foreground)', marginBottom:4 }}>🖱 How to connect</div>
              1. Click the ● dot at the bottom of a node<br/>
              2. Click the ● dot at the top of the target node<br/>
              3. Click a connection label to delete it
            </div>
          )}
          {connecting && (
            <div style={{ margin:8, padding:10, background:'#dbeafe', borderRadius:10, border:'1px solid #93c5fd', fontSize:10, color:'#1d4ed8', textAlign:'center' }}>
              <div style={{ marginBottom:4 }}>🔗 {connecting.portId === 'yes' ? '✓ YES path' : connecting.portId === 'no' ? '✗ NO path' : 'Connecting…'}</div>
              Click the target node
              <button onClick={() => setConnecting(null)} style={{ display:'block', margin:'6px auto 0', fontSize:10, color:'var(--color-muted-foreground)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>cancel</button>
            </div>
          )}

          <div style={{ padding:8, borderTop:'1px solid var(--color-border)' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 12px', background:'var(--color-primary)', color:'white', borderRadius:10, border:'none', fontSize:12, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1 }}>
              {saving ? '⏳ Deploying…' : '🚀 Deploy flow'}
            </button>
          </div>
        </div>

        {/* ── CANVAS ── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', cursor:connecting?'crosshair':dragging?'grabbing':'grab', backgroundImage:'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize:'28px 28px', background:'#f8fafc' }}
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onMouseUp={(e) => { onMouseUp(e); isPanning.current = false; }}
          onMouseDown={onCanvasPanStart}
          onWheel={onWheel}
          onClick={(e) => {
            if (e.target === canvasRef.current || e.target === svgRef.current) {
              if (justDragged.current) { justDragged.current = false; return; }
              setConnecting(null); setSelected(null);
            }
          }}>

          {/* Zoom/pan controls */}
          <div style={{ position:'absolute', bottom:12, right:12, zIndex:40, display:'flex', gap:6 }}>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-card)', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
            <button onClick={() => setZoom(1)} style={{ height:32, padding:'0 10px', borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-card)', cursor:'pointer', fontSize:11, fontWeight:600 }}>{Math.round(zoom*100)}%</button>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-card)', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
            <button onClick={() => { setPan({x:60,y:40}); setZoom(1); }} style={{ height:32, padding:'0 10px', borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-card)', cursor:'pointer', fontSize:11 }}>↺ Reset</button>
          </div>

          {/* Pan hint */}
          <div style={{ position:'absolute', bottom:12, left:12, zIndex:40, fontSize:10, color:'var(--color-muted-foreground)', background:'var(--color-card)', padding:'4px 8px', borderRadius:6, border:'1px solid var(--color-border)', opacity:0.7 }}>
            Two-finger swipe → pan  ·  Ctrl+scroll → zoom  ·  Drag empty space → pan
          </div>

          {/* Transform container */}
          <div style={{ position:'absolute', inset:0, transformOrigin:'top left', transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>

          <svg ref={svgRef} style={{ position:'absolute', inset:0, width:'4000px', height:'4000px', overflow:'visible', pointerEvents:'none' }}>
            <defs>
              {[['#64748b','arr-0'],['#166534','arr-1'],['#a32d2d','arr-2']].map(([c,id]) => (
                <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M2 2L8 5L2 8Z" fill={c} />
                </marker>
              ))}
            </defs>
            {connections.map((c, i) => {
              const arrowId = c.color === '#166534' ? 'arr-1' : c.color === '#a32d2d' ? 'arr-2' : 'arr-0';
              const midX = (c.from.x + c.to.x) / 2;
              const midY = (c.from.y + c.to.y) / 2;
              return (
                <g key={i}>
                  <path d={bezier(c.from.x, c.from.y, c.to.x, c.to.y)} stroke={c.color} strokeWidth="2" fill="none" markerEnd={`url(#${arrowId})`} opacity="0.85" />
                  <g style={{ pointerEvents:'all', cursor:'pointer' }} onClick={(e) => { e.stopPropagation(); deleteConnection(c.fromId, c.portId); }}>
                    <circle cx={midX} cy={midY} r="9" fill="white" stroke={c.color} strokeWidth="1.5" opacity="0.95" />
                    <text x={midX} y={midY+1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill={c.color}>×</text>
                  </g>
                </g>
              );
            })}
            {connecting && previewFrom && (
              <path d={bezier(previewFrom.x, previewFrom.y, mousePos.x, mousePos.y)} stroke={previewFrom.color} strokeWidth="2" fill="none" strokeDasharray="6 4" opacity="0.6" />
            )}
            {nodes.filter(n => n.type === 'yesno').map(n => outputPorts(n).map(p => (
              <g key={p.id+n.id}>
                <rect x={p.x-12} y={p.y+14} width="24" height="13" rx="6" fill={p.bg} />
                <text x={p.x} y={p.y+21} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={p.color}>{p.label}</text>
              </g>
            )))}
          </svg>

          {nodes.map(node => {
            const style = ns(node.type);
            const sel = selected === node.id;
            const ports = outputPorts(node);
            const h = nodeHeight(node);
            const isConnTarget = connecting && connecting.fromNodeId !== node.id;
            return (
              <div key={node.id} style={{ position:'absolute', left:node.position.x, top:node.position.y, width:NODE_W, zIndex:sel?20:10, userSelect:'none' }}>
                {node.type !== 'start' && (
                  <div className="port" onClick={e => onPortClick(e, node.id, 'in')}
                    style={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)', width:16, height:16, borderRadius:'50%', border:'2px solid white', zIndex:30, cursor:'pointer', background:isConnTarget?'#3b82f6':'#94a3b8', transition:'transform 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateX(-50%) scale(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateX(-50%) scale(1)'} />
                )}
                <div onClick={e => { e.stopPropagation(); onNodeClick(e, node.id); }}
                  onMouseDown={e => onMouseDown(e, node.id)}
                  style={{ borderRadius:16, border:`2px solid ${sel?'#3b82f6':style.border}`, background:style.bg, boxShadow:sel?'0 0 0 3px rgba(59,130,246,0.25)':'0 1px 4px rgba(0,0,0,0.08)', cursor:'pointer', minHeight:h, outline:'none' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px 4px' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:style.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.name}</div>
                      <div style={{ fontSize:9, color:style.color, opacity:0.6, marginTop:1 }}>{NODE_TYPES.find(t=>t.type===node.type)?.label}</div>
                    </div>
                    <button className="node-btn" onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
                      style={{ padding:4, borderRadius:6, border:'none', background:'transparent', cursor:'pointer', opacity:0.4, flexShrink:0 }}
                      onMouseEnter={e => e.currentTarget.style.opacity='1'}
                      onMouseLeave={e => e.currentTarget.style.opacity='0.4'}>
                      <Trash2 size={10} color={style.color} />
                    </button>
                  </div>
                  {node.type !== 'start' && node.type !== 'end' && (
                    <div style={{ padding:'0 12px 10px', display:'flex', flexWrap:'wrap', gap:4 }}>
                      {node.assignedTo?.value && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:6, background:'rgba(0,0,0,0.07)', color:style.color }}>👤 {employees.find(e=>e._id===node.assignedTo.value)?.name?.split(' ')[0] || 'assigned'}</span>}
                      {node.deadline?.mode && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:6, background:'rgba(0,0,0,0.07)', color:style.color }}>⏱ {node.deadline.mode==='lead'?`T-${node.deadline.value}d`:node.deadline.mode==='specific'?`@${node.deadline.timeOfDay}h`:`T+${node.deadline.value}${node.deadline.unit==='mins'?'m':node.deadline.unit==='days'?'d':'h'}`}</span>}
                      {node.inputFields?.length>0 && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:6, background:'rgba(0,0,0,0.07)', color:style.color }}>✎ {node.inputFields.length} field{node.inputFields.length>1?'s':''}</span>}
                      {node.type==='yesno' && node.question && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:6, background:'rgba(0,0,0,0.07)', color:style.color, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>? {node.question.slice(0,20)}{node.question.length>20?'…':''}</span>}
                    </div>
                  )}
                </div>
                {ports.map(port => (
                  <div key={port.id} className="port" onClick={e => onPortClick(e, node.id, port.id)}
                    style={{ position:'absolute', width:16, height:16, borderRadius:'50%', border:'2px solid white', zIndex:30, cursor:'pointer', background:connecting?.fromNodeId===node.id&&connecting?.portId===port.id?'#3b82f6':port.color, left:port.x-node.position.x-8, top:h-8, transition:'transform 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='scale(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                ))}
              </div>
            );
          })}

          </div>{/* end transform container */}

          {!nodes.length && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:0.2 }}>⬡</div>
                <p style={{ fontSize:13, color:'var(--color-muted-foreground)', opacity:0.6 }}>Click a node type on the left to start building</p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONFIG PANEL ── */}
        <div style={{ width:256, flexShrink:0, borderLeft:'1px solid var(--color-border)', background:'var(--color-card)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Flow settings — scrollable top section */}
          <div style={{ padding:12, borderBottom:'1px solid var(--color-border)', overflowY:'auto', maxHeight:'38%', flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-muted-foreground)', marginBottom:8 }}>Flow settings</div>
            <div style={{ marginBottom:6 }}>
              <Label>Flow name *</Label>
              <Inp placeholder="e.g. Order to Delivery" value={meta.name} onChange={e => setMeta(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom:6 }}>
              <Label>Sheet ID *</Label>
              <Inp placeholder="From sheet URL" value={meta.googleSheetId} onChange={e => setMeta(p => ({ ...p, googleSheetId: e.target.value }))} />
            </div>
            <div style={{ marginBottom:6 }}>
              <Label>Script URL *</Label>
              <Inp placeholder="https://script.google.com/…" value={meta.scriptUrl} onChange={e => setMeta(p => ({ ...p, scriptUrl: e.target.value }))} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
              <div><Label>Tab</Label><Inp placeholder="Sheet1" value={meta.tabName} onChange={e => setMeta(p => ({ ...p, tabName: e.target.value }))} /></div>
              <div><Label>ID column</Label><Inp placeholder="Order ID" value={meta.uniqueIdColumn} onChange={e => setMeta(p => ({ ...p, uniqueIdColumn: e.target.value }))} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
              <div><Label>Open (hr)</Label><Inp type="number" min={0} max={23} value={meta.workingHours.open} onChange={e => setMeta(p => ({ ...p, workingHours: { ...p.workingHours, open: +e.target.value } }))} /></div>
              <div><Label>Close (hr)</Label><Inp type="number" min={0} max={23} value={meta.workingHours.close} onChange={e => setMeta(p => ({ ...p, workingHours: { ...p.workingHours, close: +e.target.value } }))} /></div>
            </div>
            <button onClick={loadCols} disabled={loadingCols}
              style={{ width:'100%', padding:'6px 0', fontSize:10, fontWeight:600, border:'1px solid var(--color-border)', borderRadius:8, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, opacity:loadingCols?0.5:1 }}>
              {loadingCols ? '⏳' : '→'} {sheetCols.length ? `${sheetCols.length} columns loaded` : 'Load sheet columns'}
            </button>
          </div>

          {/* Node config — THIS SCROLLS */}
          <div style={{ flex:'1 1 0', minHeight:0, overflowY:'auto', padding:12 }}>
            {!selNode ? (
              <div style={{ textAlign:'center', paddingTop:40 }}>
                <div style={{ fontSize:20, opacity:0.2, marginBottom:8 }}>⚙️</div>
                <p style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>Click a node to configure it</p>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:8, background:ns(selNode.type).bg, color:ns(selNode.type).color }}>{selNode.name}</div>
                  <button onClick={() => setSelected(null)} style={{ padding:4, background:'none', border:'none', cursor:'pointer', color:'var(--color-muted-foreground)' }}>✕</button>
                </div>

                <Sec title="What — Step name" />
                <Inp value={selNode.name} onChange={e => updateNode(selNode.id, { name: e.target.value })} />

                {selNode.type !== 'start' && selNode.type !== 'end' && (<>
                  <Sec title="Who — Assign to" />
                  <Sel value={selNode.assignedTo.value} onChange={e => updateNested(selNode.id, 'assignedTo', { type:'employee', value: e.target.value })}>
                    <option value="">Select employee…</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                  </Sel>

                  <Sec title="When — Deadline" />
                  <Sel value={selNode.deadline.mode || ''} onChange={e => updateNested(selNode.id, 'deadline', { mode: e.target.value || null })}>
                    <option value="">No deadline</option>
                    <option value="specific">Fixed time of day</option>
                    <option value="wwh">T+N — within working hours</option>
                    <option value="wwh2">T+N — trigger outside hours</option>
                    <option value="days">T+N working days</option>
                    <option value="lead">T-N days before a date</option>
                  </Sel>

                  {selNode.deadline.mode === 'specific' && (
                    <div style={{ marginTop:6 }}>
                      <Label>Complete within</Label>
                      <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                        <Inp type="number" min={0} value={selNode.deadline.value} style={{ flex:1 }} placeholder="Amount"
                          onChange={e => updateNested(selNode.id, 'deadline', { value: +e.target.value })} />
                        <Sel value={selNode.deadline.unit || 'hours'} style={{ flex:1 }} onChange={e => updateNested(selNode.id, 'deadline', { unit: e.target.value })}>
                          <option value="mins">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </Sel>
                      </div>
                      <Label>Fixed time of day (24hr)</Label>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <Inp type="number" min={0} max={23} value={selNode.deadline.timeOfDay ?? 9}
                          onChange={e => updateNested(selNode.id, 'deadline', { timeOfDay: +e.target.value })} />
                        <span style={{ fontSize:11, color:'var(--color-muted-foreground)', whiteSpace:'nowrap' }}>
                          = {(selNode.deadline.timeOfDay??9) >= 12 ? `${(selNode.deadline.timeOfDay??9)===12?12:(selNode.deadline.timeOfDay??9)-12}:00 PM` : `${selNode.deadline.timeOfDay??9}:00 AM`}
                        </span>
                      </div>
                    </div>
                  )}
                  {selNode.deadline.mode && ['wwh','wwh2','days'].includes(selNode.deadline.mode) && (
                    <div style={{ marginTop:6 }}>
                      <Label>Complete within</Label>
                      <div style={{ display:'flex', gap:6 }}>
                        <Inp type="number" min={0} value={selNode.deadline.value} style={{ flex:1 }}
                          onChange={e => updateNested(selNode.id, 'deadline', { value: +e.target.value })} />
                        <Sel value={selNode.deadline.unit || 'hours'} style={{ flex:1 }} onChange={e => updateNested(selNode.id, 'deadline', { unit: e.target.value })}>
                          <option value="mins">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </Sel>
                      </div>
                    </div>
                  )}
                  {selNode.deadline.mode === 'lead' && (
                    <div style={{ marginTop:6 }}>
                      <Label>Days before date</Label>
                      <Inp type="number" min={0} value={selNode.deadline.value} style={{ marginBottom:6 }}
                        onChange={e => updateNested(selNode.id, 'deadline', { value: +e.target.value })} />
                      <Label>Date column from sheet</Label>
                      <Inp placeholder="e.g. Ship Date" value={selNode.deadline.dateColumn || ''}
                        onChange={e => updateNested(selNode.id, 'deadline', { dateColumn: e.target.value })} />
                    </div>
                  )}
                </>)}

                {selNode.type === 'yesno' && (
                  <>
                    <Sec title="Question" />
                    <Inp placeholder="Is material available?" value={selNode.question} onChange={e => updateNode(selNode.id, { question: e.target.value })} />
                  </>
                )}

                {(selNode.type === 'action' || selNode.type === 'input' || selNode.type === 'yesno') && (<>
                  <Sec title="How — Input fields (optional)" />
                  {(selNode.inputFields || []).map(field => (
                    <div key={field.id} style={{ border:'1px solid var(--color-border)', borderRadius:8, padding:8, marginBottom:6 }}>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        <Inp placeholder="Field label" value={field.label} onChange={e => updateField(selNode.id, field.id, { label: e.target.value })} />
                        <button onClick={() => deleteField(selNode.id, field.id)} style={{ padding:4, background:'none', border:'none', cursor:'pointer', color:'var(--color-muted-foreground)', flexShrink:0 }}>✕</button>
                      </div>
                      <Sel value={field.type} onChange={e => updateField(selNode.id, field.id, { type: e.target.value })} style={{ marginBottom:4 }}>
                        {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Sel>
                      {field.type === 'dropdown' && (
                        <Inp placeholder="opt1, opt2, opt3" value={(field.options||[]).join(', ')}
                          onChange={e => updateField(selNode.id, field.id, { options: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
                      )}
                      <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'var(--color-muted-foreground)', cursor:'pointer', marginTop:4 }}>
                        <input type="checkbox" checked={field.required} onChange={e => updateField(selNode.id, field.id, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>
                  ))}
                  <button onClick={() => addField(selNode.id)}
                    style={{ width:'100%', padding:'6px 0', fontSize:10, fontWeight:500, border:'1px dashed var(--color-border)', borderRadius:8, background:'transparent', cursor:'pointer', color:'var(--color-muted-foreground)', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                    + Add input field
                  </button>
                </>)}

                {selNode.type !== 'start' && selNode.type !== 'end' && (<>
                  <Sec title="Notifications" />
                  <Sel value={selNode.notifyChannel} onChange={e => updateNode(selNode.id, { notifyChannel: e.target.value })}>
                    <option value="both">WhatsApp + in-app</option>
                    <option value="whatsapp">WhatsApp only</option>
                    <option value="inapp">In-app only</option>
                    <option value="none">None</option>
                  </Sel>
                </>)}

                <div style={{ height:40 }} /> {/* bottom breathing room */}
              </div>
            )}
          </div>

          {error && (
            <div style={{ margin:8, padding:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, display:'flex', alignItems:'flex-start', gap:6, flexShrink:0 }}>
              <span style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}>⚠</span>
              <p style={{ fontSize:10, color:'#dc2626', margin:0 }}>{error}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}