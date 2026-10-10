// Run from the client folder:  node fix-masters-client.cjs
const fs = require('fs');
const path = require('path');

function patchFile(file, edits) {
  const p = path.join(process.cwd(), file);
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const L = (t) => t.split('\n').join(nl);
  for (const e of edits) {
    const want = e.count || 1;
    const n = (s.match(new RegExp(e.re.source, 'g')) || []).length;
    if (n !== want) { console.error(`ABORT ${file}: anchor "${e.name}" matched ${n} times (need ${want}). Nothing written.`); process.exit(1); }
    s = s.replace(new RegExp(e.re.source, 'g'), (...a) => e.fn(a, L));
  }
  fs.writeFileSync(p, s);
  console.log('patched', file);
}

// ───────────────────────── Settings.jsx ─────────────────────────
const SETTINGS_SECTION = `{/* SECTION: SECTORS / DEPARTMENTS & LOCATIONS (masters used by Add Employee) */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl">
          <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-6 uppercase tracking-tight">
            <Building2 size={22} className="text-primary" /> Sectors / Departments &amp; Locations
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-10 ml-1">These lists become the dropdowns in Add Employee and the filters when mapping people. Click "Commit Global Updates" below to save.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { kind: 'sector', title: 'Sector / Department', list: sectorList, value: newSector, setValue: setNewSector, ph: 'e.g. Operations' },
              { kind: 'location', title: 'Location', list: locationList, value: newLocation, setValue: setNewLocation, ph: 'e.g. Pune Plant' },
            ].map((m) => (
              <div key={m.kind} className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{m.title}</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={m.value}
                    placeholder={m.ph}
                    maxLength={60}
                    onChange={(e) => m.setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaster(m.kind); } }}
                    className="flex-1 min-w-0 bg-background border border-border text-foreground px-5 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm shadow-inner"
                  />
                  <button type="button" onClick={() => addMaster(m.kind)} className="px-5 py-3 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 flex items-center gap-2"><FiPlus size={14} /> Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.list.length === 0 && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">None added yet</span>}
                  {m.list.map((name) => (
                    <span key={name} className="inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-background border border-border text-xs font-black text-foreground">
                      {name}
                      <button type="button" onClick={() => removeMaster(m.kind, name)} className="p-1 rounded-full text-red-500 hover:bg-red-500/10" title={\`Remove \${name}\`}><FiX size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-8 ml-1">Removing a name here does not change employees who already have it.</p>
        </section>

        `;
const SETTINGS_HANDLERS = `const addMaster = (kind) => {
    const isSector = kind === 'sector';
    const raw = (isSector ? newSector : newLocation).replace(/\\s+/g, ' ').trim();
    const clear = () => (isSector ? setNewSector('') : setNewLocation(''));
    if (!raw) return;
    if (raw.length > 60) { alert('Please keep the name under 60 characters.'); return; }
    const list = isSector ? sectorList : locationList;
    if (!list.some((x) => x.toLowerCase() === raw.toLowerCase())) {
      (isSector ? setSectorList : setLocationList)([...list, raw]);
    }
    clear();
  };
  const removeMaster = (kind, name) => {
    (kind === 'sector' ? setSectorList : setLocationList)((prev) => prev.filter((x) => x !== name));
  };

  const saveSettings = async () => {`;

patchFile('src/pages/Settings.jsx', [
  { name: 'state', re: /(  const \[badgeLibrary, setBadgeLibrary\] = useState\(\[\]\);)/,
    fn: (a, L) => a[1] + L(`

  // Company masters (dropdown lists for Add Employee)
  const [sectorList, setSectorList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [newSector, setNewSector] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [mastersLoaded, setMastersLoaded] = useState(false); // only save the lists once they were read`) },
  { name: 'fetch', re: /(        setBadgeLibrary\(Array\.isArray\(data\.badgeLibrary\) \? data\.badgeLibrary : \[\]\);)/,
    fn: (a, L) => a[1] + L(`
        setSectorList(Array.isArray(data.sectors) ? data.sectors : []);
        setLocationList(Array.isArray(data.locations) ? data.locations : []);
        setMastersLoaded(true);`) },
  { name: 'payload', re: /(        badgeLibrary: badgeLibrary) *(\r?\n      \}\);)/,
    fn: (a, L) => a[1] + ',' + L(`
        ...(mastersLoaded ? { sectors: sectorList, locations: locationList } : {})`) + a[2] },
  { name: 'handlers', re: /const saveSettings = async \(\) => \{/,
    fn: (a, L) => L(SETTINGS_HANDLERS) },
  { name: 'section', re: /\{\/\* SECTION 1: WORKING HOURS \*\/\}/,
    fn: (a, L) => L(SETTINGS_SECTION) + a[0] },
]);

// ───────────────────────── AddEmployee.jsx ─────────────────────────
const SCOPE_HELPERS = `/**
 * Filter helpers for the mapping lists (name search + location + sector / department).
 */
const matchesScope = (e, f) => {
  const q = (f.q || '').trim().toLowerCase();
  if (q && !String(e.name || '').toLowerCase().includes(q)) return false;
  if (f.loc && (e.location || '') !== f.loc) return false;
  if (f.sec && (e.department || '') !== f.sec) return false;
  return true;
};
const uniqNames = (arr) => [...new Set(arr.filter(Boolean))];

const ScopeFilter = ({ filter, onChange, pool, sectors, locations, shown }) => {
  const locOpts = uniqNames([...locations, ...pool.map((e) => e.location)]);
  const secOpts = uniqNames([...sectors, ...pool.map((e) => e.department)]);
  const active = !!(filter.q || filter.loc || filter.sec);
  const selectCls = "px-3 py-2.5 bg-background border border-border text-foreground rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 shadow-inner min-w-0";
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter.q}
            placeholder="Search by name…"
            onChange={(e) => onChange({ ...filter, q: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 bg-background border border-border text-foreground rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 shadow-inner"
          />
        </div>
        {locOpts.length > 0 && (
          <select value={filter.loc} onChange={(e) => onChange({ ...filter, loc: e.target.value })} className={selectCls} aria-label="Filter by location">
            <option value="">All locations</option>
            {locOpts.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {secOpts.length > 0 && (
          <select value={filter.sec} onChange={(e) => onChange({ ...filter, sec: e.target.value })} className={selectCls} aria-label="Filter by sector or department">
            <option value="">All sectors / departments</option>
            {secOpts.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
        <span>{shown === 0 ? 'No matching people' : \`Showing \${shown} of \${pool.length}\`}</span>
        {active && <button type="button" onClick={() => onChange({ q: '', loc: '', sec: '' })} className="text-primary hover:underline">Clear filters</button>}
      </div>
    </div>
  );
};

/**
 * ADD EMPLOYEE: PERSONNEL PROVISIONING MODULE v1.7`;

const DEPT_SELECT = (orig) => `{masters.sectors.length > 0 ? (
              <select
                value={formData.department || ""}
                required
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="">Select sector / department</option>
                {formData.department && !masters.sectors.includes(formData.department) && (
                  <option value={formData.department}>{formData.department} (current, not in list)</option>
                )}
                {masters.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              ${orig}
            )}`;

const LOCATION_BLOCK = `{(masters.locations.length > 0 || formData.location) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="flex flex-col">
              <InputLabel icon={MapPin} label="Location" />
              <select
                value={formData.location || ""}
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              >
                <option value="">Not assigned</option>
                {formData.location && !masters.locations.includes(formData.location) && (
                  <option value={formData.location}>{formData.location} (current, not in list)</option>
                )}
                {masters.locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* COMMUNICATION & WORK PREFERENCE BLOCK */}`;

patchFile('src/pages/AddEmployee.jsx', [
  { name: 'icons', re: /  Upload(\r?\n)\} from "lucide-react";/,
    fn: (a) => '  Upload,' + a[1] + '  MapPin,' + a[1] + '  Search' + a[1] + '} from "lucide-react";' },
  { name: 'helpers', re: /\/\*\*(\r?\n) \* ADD EMPLOYEE: PERSONNEL PROVISIONING MODULE v1\.7/,
    fn: (a, L) => L(SCOPE_HELPERS) },
  { name: 'form defaults', count: 3, re: /department: "",/,
    fn: (a) => 'department: "",\n        location: "",' },
  { name: 'load selected', re: /department: selectedEmployee\.department \|\| "",/,
    fn: () => 'department: selectedEmployee.department || "",\n        location: selectedEmployee.location || "",' },
  { name: 'state + fetch', re: /(  const \[showBulk, setShowBulk\] = useState\(false\);)/,
    fn: (a, L) => a[1] + L(`

  // Company masters (managed in Settings) + filters for the two mapping lists
  const [masters, setMasters] = useState({ sectors: [], locations: [] });
  const [doerFilter, setDoerFilter] = useState({ q: "", loc: "", sec: "" });
  const [scopeFilter, setScopeFilter] = useState({ q: "", loc: "", sec: "" });

  useEffect(() => {
    if (!tenantId) return;
    let off = false;
    (async () => {
      try {
        const r = await API.get(\`/tasks/settings/\${tenantId}\`);
        const d = r.data?.settings || r.data || {};
        if (!off) setMasters({
          sectors: Array.isArray(d.sectors) ? d.sectors : [],
          locations: Array.isArray(d.locations) ? d.locations : [],
        });
      } catch (err) {
        console.error("Could not load sectors/locations:", err);
      }
    })();
    return () => { off = true; };
  }, [tenantId]);`) },
  { name: 'pools', re: /(  const InputLabel = \(\{ icon: Icon, label \}\) => \()/,
    fn: (a, L) => L(`  const staffList = Array.isArray(allEmployees) ? allEmployees : [];
  const hasRole = (e, r) => (Array.isArray(e.roles) ? e.roles : [e.role]).includes(r);
  const isSelf = (e) => e._id === (selectedEmployee?._id || formData._id);
  const doerPool = staffList.filter((e) => hasRole(e, "Doer") && !isSelf(e));
  const assignerPool = staffList.filter((e) => hasRole(e, "Assigner") && !isSelf(e));
  const doerShown = doerPool.filter((e) => matchesScope(e, doerFilter)).length;
  const assignerShown = assignerPool.filter((e) => matchesScope(e, scopeFilter)).length;

`) + a[1] },
  { name: 'department field', re: /<input\s+type="text"\s+placeholder="e\.g\. Operations Control"[\s\S]*?department: e\.target\.value \}\)\}\s*\/>/,
    fn: (a, L) => L(DEPT_SELECT(a[0])) },
  { name: 'location field', re: /\{\/\* COMMUNICATION & WORK PREFERENCE BLOCK \*\/\}/,
    fn: (a, L) => L(LOCATION_BLOCK) },
  { name: 'doer filter bar', re: /(<LinkIcon size=\{16\} \/> Directive Control \(Doer Mapping\)(\r?\n\s+)<\/h4>)/,
    fn: (a, L) => a[1] + a[2] + '<ScopeFilter filter={doerFilter} onChange={setDoerFilter} pool={doerPool} sectors={masters.sectors} locations={masters.locations} shown={doerShown} />' },
  { name: 'scope filter bar', re: /(<ShieldCheck size=\{16\} \/> Oversight Tracking Scope(\r?\n\s+)<\/h4>)/,
    fn: (a, L) => a[1] + a[2] + '<ScopeFilter filter={scopeFilter} onChange={setScopeFilter} pool={assignerPool} sectors={masters.sectors} locations={masters.locations} shown={assignerShown} />' },
  { name: 'doer list filter', re: /(roles\.includes\("Doer"\) &&(\r?\n\s+)e\._id !== \(selectedEmployee\?\._id \|\| formData\._id\)(\r?\n\s+)\);(\r?\n\s+)\}\))/,
    fn: (a) => a[1] + a[4] + '.filter((e) => matchesScope(e, doerFilter))' },
  { name: 'assigner list filter', re: /(roles\.includes\("Assigner"\) &&(\r?\n\s+)e\._id !== \(selectedEmployee\?\._id \|\| formData\._id\)(\r?\n\s+)\);(\r?\n\s+)\}\))/,
    fn: (a) => a[1] + a[4] + '.filter((e) => matchesScope(e, scopeFilter))' },
  { name: 'doer card', re: /Sector: \{doer\.department \|\| 'N\/A'\}/,
    fn: () => "Sector: {doer.department || 'N/A'}{doer.location ? ` · ${doer.location}` : ''}" },
  { name: 'assigner card', re: /Sector: \{assigner\.department \|\| 'N\/A'\}/,
    fn: () => "Sector: {assigner.department || 'N/A'}{assigner.location ? ` · ${assigner.location}` : ''}" },
]);
console.log('DONE');
