import { useState, useRef } from 'react';
import API from '../api/axiosConfig';
import { Upload, Download, Users, CheckSquare, ClipboardList, X, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

// ── Sheet templates for download ─────────────────────────────────────────────
const EMPLOYEE_HEADERS = ['Full Name','Sector / Department','Email Address','WhatsApp Number','Sunday Working','System Access','Doer','Assigner','Coordinator','Viewer','Admin'];
const EMPLOYEE_SAMPLE  = [['John Doe','Sales','john@company.com','9876543210','FALSE','NA','TRUE','FALSE','FALSE','FALSE','FALSE']];

const TASK_HEADERS = ['Task Title','Description','Assigned To','Created By','Deadline','Priority'];
const TASK_SAMPLE  = [['Review monthly report','Check and approve the monthly sales report','Aniket','Admin','2026-07-10','high']];

const CHECKLIST_HEADERS = ['Checklist Title','Description','Assigned To','Deadline','Items (semicolon separated)'];
const CHECKLIST_SAMPLE  = [['Quality Check','Check product quality before dispatch','Aniket','2026-07-15','Check dimensions;Check weight;Check packaging;Attach photos']];

function toCSV(headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))];
  return lines.join('\n');
}

function downloadCSV(filename, headers, rows) {
  const blob = new Blob([toCSV(headers, rows)], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines   = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,))/g) || [];
    const obj  = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkUpload({ tenantId, onClose, onSuccess }) {
  const [tab,     setTab]     = useState('employees');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const fileRef = useRef();

  const TABS = [
    { id: 'employees', label: 'Employees',        icon: Users,        headers: EMPLOYEE_HEADERS,  sample: EMPLOYEE_SAMPLE,  file: 'employees_template.csv'  },
    { id: 'tasks',     label: 'Delegation Tasks',  icon: CheckSquare,  headers: TASK_HEADERS,      sample: TASK_SAMPLE,      file: 'tasks_template.csv'      },
    { id: 'checklist', label: 'Checklist Tasks',   icon: ClipboardList,headers: CHECKLIST_HEADERS, sample: CHECKLIST_SAMPLE, file: 'checklist_template.csv'  },
  ];

  const activeTab = TABS.find(t => t.id === tab);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null); setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (rows.length === 0) { setError('No data found in file'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      let res;
      if (tab === 'employees') {
        res = await API.post('/tasks/bulk-employees', { tenantId, employees: rows });
      } else if (tab === 'tasks') {
        res = await API.post('/tasks/bulk-tasks', { tenantId, tasks: rows });
      } else {
        res = await API.post('/tasks/bulk-checklist', { tenantId, checklists: rows });
      }
      setResult(res.data);
      setRows([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--color-card)', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid var(--color-border)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--color-foreground)' }}>📤 Bulk Upload</div>
            <div style={{ fontSize:13, color:'var(--color-muted-foreground)', marginTop:2 }}>Upload employees, tasks or checklists from a CSV sheet</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'1px solid var(--color-border)', borderRadius:8, padding:6, cursor:'pointer', display:'flex', color:'var(--color-muted-foreground)' }}>
            <X size={18}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)', padding:'0 24px' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={()=>{ setTab(id); setRows([]); setResult(null); setError(''); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13,
                color: tab===id ? '#185FA5' : 'var(--color-muted-foreground)',
                fontWeight: tab===id ? 600 : 400,
                borderBottom: tab===id ? '2px solid #185FA5' : '2px solid transparent',
                marginBottom:-1, transition:'color .12s' }}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Step 1 - Download template */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:20, height:20, background:'#185FA5', color:'white', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>1</span>
              Download the template
            </div>
            <button onClick={()=>downloadCSV(activeTab.file, activeTab.headers, activeTab.sample)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-card)', cursor:'pointer', fontSize:13, color:'var(--color-foreground)', transition:'all .12s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#185FA5'; e.currentTarget.style.color='#185FA5'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--color-border)'; e.currentTarget.style.color='var(--color-foreground)'; }}>
              <Download size={15}/> Download {activeTab.label} template (.csv)
            </button>
            <div style={{ marginTop:8, fontSize:12, color:'var(--color-muted-foreground)' }}>
              Required columns: <span style={{ fontWeight:600 }}>{activeTab.headers.join(', ')}</span>
            </div>
          </div>

          {/* Step 2 - Fill and upload */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:20, height:20, background:'#185FA5', color:'white', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>2</span>
              Fill in your data and upload
            </div>

            {/* Upload area */}
            <div onClick={()=>fileRef.current?.click()}
              style={{ border:'2px dashed var(--color-border)', borderRadius:12, padding:'28px', textAlign:'center', cursor:'pointer', transition:'all .15s', background: rows.length > 0 ? '#ECFDF3' : 'var(--color-muted)' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#185FA5'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--color-border)'}
              onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='#185FA5'; }}
              onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='var(--color-border)'; const file = e.dataTransfer.files[0]; if(file){ const reader = new FileReader(); reader.onload = ev => setRows(parseCSV(ev.target.result)); reader.readAsText(file); } }}>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }}/>
              {rows.length > 0
                ? <div>
                    <CheckCircle size={32} color="#079455" style={{ margin:'0 auto 8px', display:'block' }}/>
                    <div style={{ fontSize:15, fontWeight:600, color:'#079455' }}>{rows.length} rows loaded</div>
                    <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>Click to replace file</div>
                  </div>
                : <div>
                    <Upload size={32} color="var(--color-muted-foreground)" style={{ margin:'0 auto 8px', display:'block' }}/>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--color-foreground)' }}>Click to upload or drag & drop</div>
                    <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>CSV files only</div>
                  </div>
              }
            </div>
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', marginBottom:8 }}>
                Preview — {rows.length} rows
              </div>
              <div style={{ border:'1px solid var(--color-border)', borderRadius:8, overflow:'hidden', overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'var(--color-muted)' }}>
                      {Object.keys(rows[0] || {}).slice(0,5).map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:600, color:'var(--color-muted-foreground)', whiteSpace:'nowrap', borderBottom:'1px solid var(--color-border)' }}>{h}</th>
                      ))}
                      {Object.keys(rows[0] || {}).length > 5 && <th style={{ padding:'8px 12px', color:'var(--color-muted-foreground)', borderBottom:'1px solid var(--color-border)' }}>+{Object.keys(rows[0]).length - 5} more</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0,5).map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--color-border)', background: i%2===0?'var(--color-card)':'var(--color-muted)' }}>
                        {Object.values(row).slice(0,5).map((v,j) => (
                          <td key={j} style={{ padding:'7px 12px', color:'var(--color-foreground)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(v)}</td>
                        ))}
                        {Object.keys(row).length > 5 && <td style={{ padding:'7px 12px', color:'var(--color-muted-foreground)' }}>…</td>}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr>
                        <td colSpan={6} style={{ padding:'7px 12px', textAlign:'center', color:'var(--color-muted-foreground)', fontSize:11 }}>
                          + {rows.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:'10px 14px', background:'#FEF3F2', borderRadius:8, fontSize:13, color:'#B42318', display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
              <AlertCircle size={15}/>{error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ padding:'14px 16px', background:'#ECFDF3', borderRadius:8, marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#067647', marginBottom:8, display:'flex', gap:6, alignItems:'center' }}>
                <CheckCircle size={16}/> Upload complete
              </div>
              <div style={{ fontSize:13, color:'#344054' }}>{result.message}</div>
              {result.results?.skipped?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#B54708', marginBottom:4 }}>Skipped ({result.results.skipped.length}):</div>
                  {result.results.skipped.map((s,i) => (
                    <div key={i} style={{ fontSize:12, color:'#344054' }}>• {s.name} — {s.reason}</div>
                  ))}
                </div>
              )}
              {result.results?.failed?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#B42318', marginBottom:4 }}>Failed ({result.results.failed.length}):</div>
                  {result.results.failed.map((f,i) => (
                    <div key={i} style={{ fontSize:12, color:'#344054' }}>• {f.name || f.title} — {f.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--color-border)', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-card)', fontSize:13, cursor:'pointer', color:'var(--color-foreground)' }}>
            Cancel
          </button>
          <button onClick={handleUpload} disabled={rows.length === 0 || loading}
            style={{ padding:'9px 20px', border:'none', borderRadius:8, background:'#185FA5', color:'white', fontSize:13, fontWeight:600, cursor: rows.length===0||loading ? 'not-allowed' : 'pointer', opacity: rows.length===0||loading ? 0.5 : 1, display:'flex', alignItems:'center', gap:6 }}>
            <Upload size={14}/>{loading ? 'Uploading…' : `Upload ${rows.length > 0 ? rows.length + ' rows' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
