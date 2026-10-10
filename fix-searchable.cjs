// Run from the client folder:  node fix-searchable.cjs
const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'src/pages/AddEmployee.jsx');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (t) => t.split('\n').join(nl);

const COMPONENT = `/**
 * Type-to-search dropdown: click, type a few letters, the list narrows, click a name to choose.
 * Only names from the given options can be chosen.
 */
const SearchableSelect = ({ value, onChange, options, placeholder, clearLabel, ariaLabel, wrapperClass = "", inputClass = "" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shownOpts = options.filter((o) => !q || o.label.toLowerCase().includes(q));
  const items = [...(clearLabel ? [{ value: "", label: clearLabel }] : []), ...shownOpts];
  const pick = (v) => { onChange(v); setOpen(false); setQuery(""); };
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { if (open) { e.preventDefault(); if (items[hi]) pick(items[hi].value); } }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };
  return (
    <div className={\`relative min-w-0 \${wrapperClass}\`}>
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        autoComplete="off"
        value={open ? query : (selected ? selected.label : "")}
        placeholder={open ? (selected ? selected.label : "Type to search…") : (clearLabel && !value ? clearLabel : placeholder)}
        onFocus={() => { setOpen(true); setQuery(""); setHi(0); }}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKeyDown}
        className={\`\${inputClass} pr-8\`}
      />
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      {open && (
        <ul role="listbox" className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-card border border-border rounded-xl shadow-xl py-1">
          {items.length === 0 && <li className="px-3 py-2 text-xs text-slate-400 font-bold">No matches</li>}
          {items.map((o, i) => (
            <li
              key={o.value || "__clear"}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setHi(i)}
              className={\`px-3 py-2 text-xs font-bold cursor-pointer \${i === hi ? "bg-primary/10 text-primary" : "text-foreground"} \${o.value === value ? "underline" : ""}\`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ScopeFilter = ({ filter, onChange, pool, sectors, locations, shown }) => {`;

const FILTER_LOC = `<SearchableSelect
            value={filter.loc}
            onChange={(v) => onChange({ ...filter, loc: v })}
            options={locOpts.map((l) => ({ value: l, label: l }))}
            clearLabel="All locations"
            placeholder="All locations"
            ariaLabel="Filter by location"
            wrapperClass="sm:w-56 shrink-0"
            inputClass={selectCls}
          />`;
const FILTER_SEC = `<SearchableSelect
            value={filter.sec}
            onChange={(v) => onChange({ ...filter, sec: v })}
            options={secOpts.map((x) => ({ value: x, label: x }))}
            clearLabel="All sectors / departments"
            placeholder="All sectors / departments"
            ariaLabel="Filter by sector or department"
            wrapperClass="sm:w-64 shrink-0"
            inputClass={selectCls}
          />`;
const DEPT = `<SearchableSelect
                value={formData.department || ""}
                onChange={(v) => setFormData({ ...formData, department: v })}
                options={[
                  ...(formData.department && !masters.sectors.includes(formData.department) ? [formData.department] : []),
                  ...masters.sectors,
                ].map((x) => ({ value: x, label: masters.sectors.includes(x) ? x : \`\${x} (current, not in list)\` }))}
                placeholder="Select sector / department"
                ariaLabel="Sector / Department"
                inputClass="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />`;
const LOC = `<SearchableSelect
                value={formData.location || ""}
                onChange={(v) => setFormData({ ...formData, location: v })}
                options={[
                  ...(formData.location && !masters.locations.includes(formData.location) ? [formData.location] : []),
                  ...masters.locations,
                ].map((x) => ({ value: x, label: masters.locations.includes(x) ? x : \`\${x} (current, not in list)\` }))}
                clearLabel="Not assigned"
                placeholder="Not assigned"
                ariaLabel="Location"
                inputClass="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />`;

const edits = [
  { name: 'icon', re: /  Search(\r?\n)\} from "lucide-react";/, fn: (m, g1) => '  Search,' + g1 + '  ChevronDown' + g1 + '} from "lucide-react";' },
  { name: 'component', re: /const ScopeFilter = \(\{ filter, onChange, pool, sectors, locations, shown \}\) => \{/, fn: () => L(COMPONENT) },
  { name: 'filter location', re: /<select value=\{filter\.loc\}[\s\S]*?<\/select>/, fn: () => L(FILTER_LOC) },
  { name: 'filter sector', re: /<select value=\{filter\.sec\}[\s\S]*?<\/select>/, fn: () => L(FILTER_SEC) },
  { name: 'department select', re: /<select\s+value=\{formData\.department \|\| ""\}[\s\S]*?<\/select>/, fn: () => L(DEPT) },
  { name: 'location select', re: /<select\s+value=\{formData\.location \|\| ""\}[\s\S]*?<\/select>/, fn: () => L(LOC) },
  { name: 'validate', re: /(const handleSubmit = async \(e\) => \{\r?\n    e\.preventDefault\(\);)/,
    fn: (m) => m + L(`
    if (masters.sectors.length > 0 && !formData.department) {
      alert("Please select a Sector / Department.");
      return;
    }`) },
];
for (const e of edits) {
  const n = (s.match(new RegExp(e.re.source, 'g')) || []).length;
  if (n !== 1) { console.error(`ABORT: anchor "${e.name}" matched ${n} times (need 1). Nothing written.`); process.exit(1); }
  s = s.replace(e.re, (...a) => e.fn(...a));
}
fs.writeFileSync(p, s);
console.log('patched src/pages/AddEmployee.jsx');
