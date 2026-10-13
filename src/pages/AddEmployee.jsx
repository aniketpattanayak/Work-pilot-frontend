import React, { useState, useEffect, useCallback } from "react";
import BulkUpload from '../components/BulkUpload';
import API from "../api/axiosConfig"; // Centralized API instance
import { dialog } from "../components/Dialog";
import {
  COUNTRIES,
  INDIA_DIAL_CODE,
  buildStoredNumber,
  parseStoredNumber,
  validateNationalNumber,
  maxNationalLength,
  findCountryById,
  findCountryByDialCode,
} from "../utils/phoneNumber";
import {
  ShieldCheck,
  UserPlus,
  CheckSquare,
  Square,
  RefreshCcw,
  Briefcase,
  Link as LinkIcon,
  Mail,
  Phone,
  User,
  Lock,
  Layers,
  CalendarDays,
  ChevronRight,
  Upload,
  MapPin,
  Search,
  ChevronDown
} from "lucide-react";

/**
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

/**
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
    <div className={`relative min-w-0 ${wrapperClass}`}>
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
        className={`${inputClass} pr-8`}
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
              className={`px-3 py-2 text-xs font-bold cursor-pointer ${i === hi ? "bg-primary/10 text-primary" : "text-foreground"} ${o.value === value ? "underline" : ""}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
          <SearchableSelect
            value={filter.loc}
            onChange={(v) => onChange({ ...filter, loc: v })}
            options={locOpts.map((l) => ({ value: l, label: l }))}
            clearLabel="All locations"
            placeholder="All locations"
            ariaLabel="Filter by location"
            wrapperClass="sm:w-56 shrink-0"
            inputClass={selectCls}
          />
        )}
        {secOpts.length > 0 && (
          <SearchableSelect
            value={filter.sec}
            onChange={(v) => onChange({ ...filter, sec: v })}
            options={secOpts.map((x) => ({ value: x, label: x }))}
            clearLabel="All sectors / departments"
            placeholder="All sectors / departments"
            ariaLabel="Filter by sector or department"
            wrapperClass="sm:w-64 shrink-0"
            inputClass={selectCls}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
        <span>{shown === 0 ? 'No matching people' : `Showing ${shown} of ${pool.length}`}</span>
        {active && <button type="button" onClick={() => onChange({ q: '', loc: '', sec: '' })} className="text-primary hover:underline">Clear filters</button>}
      </div>
    </div>
  );
};

/**
 * ADD EMPLOYEE: PERSONNEL PROVISIONING MODULE v1.7
 * Purpose: Handles multi-role registration and hierarchical mapping.
 * FIX: Resolved "Controlled to Uncontrolled" warning with robust state initialization and fallbacks.
 */
const AddEmployee = ({
  tenantId: propTenantId,
  selectedEmployee,
  onSuccess,
}) => {
  const tenantId = propTenantId || localStorage.getItem("tenantId");
  const availableRoles = ["Doer", "Assigner", "Coordinator", "Viewer", "Admin"];

  const [formData, setFormData] = useState({
    name: "",
    department: "",
        location: "",
    whatsappNumber: "",
    email: "",
    joiningDate: "",
    roles: ["Doer"],
    password: "Password@123",
    managedDoers: [],
    managedAssigners: [],
    workOnSunday: false, // Initialized as boolean
  });

  // Selected country for the WhatsApp number field. Tracked by `id` (not by
  // `dialCode`) because several countries share a dial code (US/Canada both
  // use "1") - using dialCode as the <select>'s value would make choosing
  // Canada collapse back to whichever same-dial-code country is listed
  // first. "OTHER" means the user is typing their own country code into
  // whatsappManualCode; empty string only in the rare case nothing is
  // selected at all.
  const [whatsappCountryId, setWhatsappCountryId] = useState("IN");
  const [whatsappManualCode, setWhatsappManualCode] = useState("");
  const whatsappDialCode =
    whatsappCountryId === "OTHER"
      ? whatsappManualCode
      : findCountryById(whatsappCountryId)?.dialCode || "";

  const [allEmployees, setAllEmployees] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Company masters (managed in Settings) + filters for the two mapping lists
  const [masters, setMasters] = useState({ sectors: [], locations: [] });
  const [doerFilter, setDoerFilter] = useState({ q: "", loc: "", sec: "" });
  const [scopeFilter, setScopeFilter] = useState({ q: "", loc: "", sec: "" });

  useEffect(() => {
    if (!tenantId) return;
    let off = false;
    (async () => {
      try {
        const r = await API.get(`/tasks/settings/${tenantId}`);
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
  }, [tenantId]);

  /**
   * 1. FETCH STAFF
   */
  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await API.get(`/tasks/employees/${tenantId}`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.employees || res.data?.data || [];
      setAllEmployees(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setAllEmployees([]);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /**
   * 2. LOAD DATA
   * FIX: Added !! and || "" fallbacks to ensure no 'undefined' values enter the inputs.
   */
  useEffect(() => {
    if (selectedEmployee) {
      const parsedPhone = parseStoredNumber(selectedEmployee.whatsappNumber);
      // Null dialCode means the stored number didn't match any known
      // country - don't guess, let the user explicitly pick one. Otherwise
      // take the first country in the list sharing that dial code (e.g. a
      // parsed "1" defaults to United States; the user can switch to
      // Canada explicitly if that's what it actually is).
      const parsedCountry = parsedPhone.dialCode ? findCountryByDialCode(parsedPhone.dialCode) : null;
      if (parsedCountry) {
        setWhatsappCountryId(parsedCountry.id);
        setWhatsappManualCode("");
      } else {
        // No country matched the stored number (or it has no dial code at
        // all) - preselect "Other" with an empty code box and the raw
        // stored digits in the number box, so the user splits it
        // themselves rather than Claude/the app guessing wrong.
        setWhatsappCountryId("OTHER");
        setWhatsappManualCode("");
      }
      setFormData({
        ...selectedEmployee,
        name: selectedEmployee.name || "",
        department: selectedEmployee.department || "",
        location: selectedEmployee.location || "",
        email: selectedEmployee.email || "",
        joiningDate: selectedEmployee.joiningDate ? String(selectedEmployee.joiningDate).slice(0, 10) : "",
        whatsappNumber: parsedPhone.nationalNumber,
        roles: Array.isArray(selectedEmployee.roles)
          ? selectedEmployee.roles.length > 0
            ? selectedEmployee.roles
            : ["Doer"]
          : selectedEmployee.role
            ? [selectedEmployee.role]
            : ["Doer"],
        managedDoers: Array.isArray(selectedEmployee.managedDoers)
          ? selectedEmployee.managedDoers.map((d) =>
            typeof d === "object" ? d._id : d
          )
          : [],
        managedAssigners: Array.isArray(selectedEmployee.managedAssigners)
          ? selectedEmployee.managedAssigners.map((a) =>
            typeof a === "object" ? a._id : a
          )
          : [],
        workOnSunday: !!selectedEmployee.workOnSunday, // Force boolean
        password: "",
      });
      setIsEditing(true);
    } else {
      // RESET LOGIC: Ensures fresh state for new employee entries
      setFormData({
        name: "",
        department: "",
        location: "",
        whatsappNumber: "",
        email: "",
        joiningDate: "",
        roles: ["Doer"],
        password: "Password@123",
        managedDoers: [],
        managedAssigners: [],
        workOnSunday: false, // Explicit reset
      });
      setWhatsappCountryId("IN");
      setWhatsappManualCode("");
      setIsEditing(false);
    }
  }, [selectedEmployee]);

  /**
   * 3. LOGIC HANDLERS
   */
  const handleRoleToggle = (role) => {
    const currentRoles = [...formData.roles];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) return;
      setFormData({
        ...formData,
        roles: currentRoles.filter((r) => r !== role),
      });
    } else {
      setFormData({ ...formData, roles: [...currentRoles, role] });
    }
  };

  const handleCheckboxChange = (id, type) => {
    const currentSelection = formData[type] || [];
    const isSelected = currentSelection.includes(id);
    if (isSelected) {
      setFormData({
        ...formData,
        [type]: currentSelection.filter((item) => item !== id),
      });
    } else {
      setFormData({ ...formData, [type]: [...currentSelection, id] });
    }
  };

  /**
   * 4. SUBMIT HANDSHAKE
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (masters.sectors.length > 0 && !formData.department) {
      await dialog.alert("Please select a Sector / Department.", { tone: "error", title: "Department needed" });
      return;
    }
    if (!whatsappCountryId) {
      await dialog.alert("Please select a country code for the WhatsApp number.", { tone: "error", title: "Check the WhatsApp number" });
      return;
    }
    // An empty manual code (whatsappCountryId === "OTHER" with nothing
    // typed yet) is NOT caught above - it falls through to
    // validateNationalNumber, which returns its own "Please type the
    // country code." message for that case.
    const phoneCheck = validateNationalNumber(whatsappDialCode, formData.whatsappNumber);
    if (!phoneCheck.valid) {
      await dialog.alert(phoneCheck.message, { tone: "error", title: "Check the WhatsApp number" });
      return;
    }
    if (formData.joiningDate && formData.joiningDate > new Date().toISOString().slice(0, 10)) {
      await dialog.alert("Joining date cannot be in the future.", { tone: "error", title: "Check the joining date" });
      return;
    }
    setLoading(true);
    try {
      const finalRoles = formData.roles.length > 0 ? formData.roles : ["Doer"];
      const submissionData = {
        ...formData,
        whatsappNumber: buildStoredNumber(whatsappDialCode, formData.whatsappNumber),
        roles: finalRoles,
        tenantId,
      };

      if (isEditing && !formData.password) {
        delete submissionData.password;
      }

      if (isEditing) {
        await API.put(
          `/tasks/employees/${selectedEmployee._id}`,
          submissionData
        );
        await dialog.alert("The employee profile has been updated.", { tone: "success", title: "Updated" });
      } else {
        await API.post("/tasks/add-employee", submissionData);
        await dialog.alert("The new employee has been added.", { tone: "success", title: "Employee added" });
      }

      setFormData({
        name: "",
        department: "",
        location: "",
        whatsappNumber: "",
        email: "",
        roles: ["Doer"],
        password: "Password@123",
        managedDoers: [],
        managedAssigners: [],
        workOnSunday: false,
      });
      setWhatsappCountryId("IN");
      setWhatsappManualCode("");
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || "Could not save. Please check your connection and try again.", { tone: "error", title: "Not saved" });
    } finally {
      setLoading(false);
    }
  };

  const staffList = Array.isArray(allEmployees) ? allEmployees : [];
  const hasRole = (e, r) => (Array.isArray(e.roles) ? e.roles : [e.role]).includes(r);
  const isSelf = (e) => e._id === (selectedEmployee?._id || formData._id);
  const doerPool = staffList.filter((e) => hasRole(e, "Doer") && !isSelf(e));
  const assignerPool = staffList.filter((e) => hasRole(e, "Assigner") && !isSelf(e));
  const doerShown = doerPool.filter((e) => matchesScope(e, doerFilter)).length;
  const assignerShown = assignerPool.filter((e) => matchesScope(e, scopeFilter)).length;

  const InputLabel = ({ icon: Icon, label }) => (
    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
      <Icon size={14} className="text-primary" /> {label}
    </label>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-card rounded-2xl border border-border shadow-xl">
        {/*<div className=" bg-transparent shadow-none border-none w-full">*/}
          {/* bg-card backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-border overflow-hidden shadow-2xl animate-in fade-in duration-700 transition-colors duration-500 */}

      <div className="px-4 py-4 sm:px-6 sm:py-5 bg-primary/5 border-b border-border">
        <div className="flex items-start justify-between gap-3 flex-wrap pr-12 sm:pr-14">
          <div className="min-w-0">
            <h2 className="text-primary m-0 flex items-center gap-3 text-base sm:text-lg font-black tracking-tighter uppercase leading-tight">
              <UserPlus size={24} className="sm:w-7 sm:h-7 shrink-0" />{" "}
              {isEditing
                ? `Edit Employee: ${formData.name || ""}`
                : "Add New Employees "}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-[9px] sm:text-xs font-medium uppercase tracking-tight opacity-80">
              Configure authentication, company roles and organizational reporting lines
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-card text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all shrink-0 whitespace-nowrap mr-10 sm:mr-12"
            >
              <Upload size={14} /> Bulk Upload
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-5">

        {/* IDENTITY BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="flex flex-col">
            <InputLabel icon={User} label="Full Name" />
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name || ""} // Safe Fallback
              required
              className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Briefcase} label="Sector / Department" />
            {masters.sectors.length > 0 ? (
              <SearchableSelect
                value={formData.department || ""}
                onChange={(v) => setFormData({ ...formData, department: v })}
                options={[
                  ...(formData.department && !masters.sectors.includes(formData.department) ? [formData.department] : []),
                  ...masters.sectors,
                ].map((x) => ({ value: x, label: masters.sectors.includes(x) ? x : `${x} (current, not in list)` }))}
                placeholder="Select sector / department"
                ariaLabel="Sector / Department"
                inputClass="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />
            ) : (
              <input
              type="text"
              placeholder="e.g. Operations Control"
              value={formData.department || ""} // Safe Fallback
              required
              className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            )}
          </div>
        </div>

        {(masters.locations.length > 0 || formData.location) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="flex flex-col">
              <InputLabel icon={MapPin} label="Location" />
              <SearchableSelect
                value={formData.location || ""}
                onChange={(v) => setFormData({ ...formData, location: v })}
                options={[
                  ...(formData.location && !masters.locations.includes(formData.location) ? [formData.location] : []),
                  ...masters.locations,
                ].map((x) => ({ value: x, label: masters.locations.includes(x) ? x : `${x} (current, not in list)` }))}
                clearLabel="Not assigned"
                placeholder="Not assigned"
                ariaLabel="Location"
                inputClass="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="flex flex-col">
            <InputLabel icon={CalendarDays} label="Joining date" />
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={formData.joiningDate ? String(formData.joiningDate).slice(0, 10) : ""}
              title="The real date this person started, used for leave accrual and payroll pro-ration. Cannot be in the future."
              className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            />
            <span className="text-[10px] text-slate-400 mt-1 ml-1">Used for leave accrual and payroll pro-ration. Leave blank to default to today.</span>
          </div>
        </div>

        {/* COMMUNICATION & WORK PREFERENCE BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 ">
          <div className="flex flex-col">
            <InputLabel icon={Mail} label="Email Address" />
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email || ""} // Safe Fallback
              required
              className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Phone} label="WhatsApp number" />
            <div className="flex gap-2">
              <select
                value={whatsappCountryId || ""}
                aria-label="Country code"
                title="Country code"
                className="px-2 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner shrink-0 max-w-[9.5rem]"
                onChange={(e) => setWhatsappCountryId(e.target.value)}
              >
                {!whatsappCountryId && (
                  <option value="" disabled>
                    Select code
                  </option>
                )}
                {COUNTRIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.name} (+{c.dialCode})
                  </option>
                ))}
                <option value="OTHER">🌐 Other (type country code)</option>
              </select>
              {whatsappCountryId === "OTHER" && (
                <div className="flex items-center shrink-0 w-20 bg-background border border-border rounded-2xl shadow-inner focus-within:ring-4 focus-within:ring-primary/10">
                  <span className="pl-3 text-xs font-bold text-slate-400">+</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Code"
                    aria-label="Manual country code"
                    title="Country code, 1-4 digits, no leading 0"
                    value={whatsappManualCode}
                    required
                    className="w-full min-w-0 pl-1 pr-3 py-2.5 bg-transparent text-foreground rounded-2xl text-xs font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, "");
                      digits = digits.length > 1 && digits[0] === "0" ? digits.slice(1) : digits;
                      digits = digits.slice(0, 4);
                      setWhatsappManualCode(digits);
                    }}
                  />
                </div>
              )}
              <input
                type="tel"
                inputMode="numeric"
                maxLength={whatsappDialCode === INDIA_DIAL_CODE ? 10 : maxNationalLength(whatsappDialCode || "")}
                pattern={whatsappDialCode === INDIA_DIAL_CODE ? "[0-9]{10}" : undefined}
                title={
                  whatsappDialCode === INDIA_DIAL_CODE
                    ? "Enter the 10-digit mobile number"
                    : "Enter the national mobile number, without the country code or a leading 0"
                }
                placeholder={whatsappDialCode === INDIA_DIAL_CODE ? "10-digit mobile number" : "National mobile number"}
                value={formData.whatsappNumber || ""} // Safe Fallback
                required
                className="w-full min-w-0 px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner"
                onChange={(e) => {
                  let digits = e.target.value.replace(/\D/g, "");
                  if (whatsappDialCode === INDIA_DIAL_CODE) {
                    digits = digits.slice(0, 10);
                  } else {
                    digits = digits.length > 1 && digits[0] === "0" ? digits.slice(1) : digits;
                    digits = digits.slice(0, maxNationalLength(whatsappDialCode || ""));
                  }
                  setFormData({ ...formData, whatsappNumber: digits });
                }}
              />
            </div>
          </div>

          {/* SUNDAY WORK PREFERENCE TOGGLE */}
          <div className="md:col-span-2">
              <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-xl border border-border flex items-center justify-between gap-3 shadow-inner">

                <div className="flex items-center gap-3 min-w-0">
                     <div
                        className={`p-2 rounded-lg transition-all duration-300 ${
                        formData.workOnSunday
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-slate-200 text-slate-400"
                       }`}
                  >
                  <CalendarDays
                    size={16}
                     className={formData.workOnSunday ? "animate-pulse" : ""}
                  />
              </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black text-foreground uppercase leading-none truncate">
          Sunday Working
        </p>
        <p className="text-[8px] text-slate-500 font-semibold mt-1 opacity-70 truncate">
          Tasks enabled on Sundays
        </p>
      </div>
    </div>

    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={!!formData.workOnSunday}
        onChange={(e) =>
          setFormData({ ...formData, workOnSunday: e.target.checked })
        }
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full 
        peer-checked:after:translate-x-5 
        after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all 
        peer-checked:bg-amber-500 shadow-inner">
      </div>
    </label>

  </div>
</div>
        </div>

        {/* SECURITY & PERMISSIONS BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="flex flex-col">
            <InputLabel
              icon={Lock}
              label={isEditing ? "Reset Password" : "system access password"}
            />
            <input
              type="text"
              placeholder={isEditing ? "Blank to maintain current" : "Minimum 8 characters"}
              value={formData.password || ""} // Safe Fallback
              required={!isEditing}
              className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner font-mono"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <InputLabel icon={Layers} label="Assigned Permissions" />
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleToggle(role)}
                  className={`px-4 py-2.5 rounded-xl cursor-pointer text-[9px] flex items-center gap-2 font-black transition-all border uppercase tracking-widest ${(formData.roles || []).includes(role)
                    ? "bg-primary/10 border-primary/50 text-primary shadow-lg shadow-primary/5"
                    : "bg-background border-border text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  {(formData.roles || []).includes(role) ? (
                    <CheckSquare size={14} strokeWidth={3} />
                  ) : (
                    <Square size={14} strokeWidth={2} />
                  )}{" "}
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- DYNAMIC HIERARCHY MAPPING --- */}
        {formData.roles.includes("Assigner") && (
          <div className="bg-emerald-500/5 p-6 sm:p-8 rounded-[2rem] border border-emerald-500/20 border-l-4 border-l-emerald-500 animate-in slide-in-from-left-4">
            <h4 className="text-emerald-600 dark:text-emerald-400 m-0 mb-6 text-[10px] flex items-center gap-2 font-black uppercase tracking-[0.2em]">
              <LinkIcon size={16} /> Directive Control (Doer Mapping)
            </h4>
            <ScopeFilter filter={doerFilter} onChange={setDoerFilter} pool={doerPool} sectors={masters.sectors} locations={masters.locations} shown={doerShown} />
            <div className="max-h-[220px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
              {Array.isArray(allEmployees) &&
                allEmployees
                  .filter((e) => {
                    const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                    return (
                      roles.includes("Doer") &&
                      e._id !== (selectedEmployee?._id || formData._id)
                    );
                  })
                  .filter((e) => matchesScope(e, doerFilter))
                  .map((doer) => (
                    <label
                      key={doer._id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all shadow-sm ${(formData.managedDoers || []).includes(doer._id)
                        ? "bg-card border-emerald-500/40 text-foreground"
                        : "bg-background border-border text-slate-400"
                        }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black truncate leading-tight uppercase tracking-tight">
                          {doer.name}
                        </span>
                        <span className="text-[9px] opacity-60 uppercase font-bold tracking-tighter mt-1">
                          Sector: {doer.department || 'N/A'}{doer.location ? ` · ${doer.location}` : ''}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                        checked={(formData.managedDoers || []).includes(doer._id)}
                        onChange={() => handleCheckboxChange(doer._id, "managedDoers")}
                      />
                    </label>
                  ))}
            </div>
          </div>
        )}

        {(formData.roles.includes("Coordinator") || formData.roles.includes("Admin")) && (
          <div className="bg-primary/5 p-6 sm:p-8 rounded-[2rem] border border-primary/20 border-l-4 border-l-primary animate-in slide-in-from-left-4">
            <h4 className="text-primary m-0 mb-6 text-[10px] flex items-center gap-2 font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={16} /> Oversight Tracking Scope
            </h4>
            <ScopeFilter filter={scopeFilter} onChange={setScopeFilter} pool={assignerPool} sectors={masters.sectors} locations={masters.locations} shown={assignerShown} />
            <div className="max-h-[220px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2 custom-scrollbar">
              {Array.isArray(allEmployees) &&
                allEmployees
                  .filter((e) => {
                    const roles = Array.isArray(e.roles) ? e.roles : [e.role];
                    return (
                      roles.includes("Assigner") &&
                      e._id !== (selectedEmployee?._id || formData._id)
                    );
                  })
                  .filter((e) => matchesScope(e, scopeFilter))
                  .map((assigner) => (
                    <label
                      key={assigner._id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all shadow-sm ${(formData.managedAssigners || []).includes(assigner._id)
                        ? "bg-card border-primary/40 text-foreground"
                        : "bg-background border-border text-slate-400"
                        }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black truncate leading-tight uppercase tracking-tight">
                          {assigner.name}
                        </span>
                        <span className="text-[9px] opacity-60 uppercase font-bold tracking-tighter mt-1">
                          Sector: {assigner.department || 'N/A'}{assigner.location ? ` · ${assigner.location}` : ''}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-primary shrink-0"
                        checked={(formData.managedAssigners || []).includes(assigner._id)}
                        onChange={() => handleCheckboxChange(assigner._id, "managedAssigners")}
                      />
                    </label>
                  ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`group relative mt-4 py-5 px-8 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-4 shadow-xl ${loading
            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-sky-500 to-sky-600 text-white dark:text-slate-950 hover:shadow-primary/30 active:scale-95 cursor-pointer"
            }`}
        >
          {loading ? (
            <RefreshCcw className="animate-spin" size={20} />
          ) : (
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
          )}
          {isEditing
            ? "Role Update"
            : "Finalize Employee Registration"}
        </button>
      </form>

      {showBulk && (
        <BulkUpload
          tenantId={tenantId}
          mode="employees"
          onClose={() => setShowBulk(false)}
          onSuccess={() => {
            setShowBulk(false);
            fetchStaff();
            if (onSuccess) onSuccess();
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: var(--color-primary); 
        }
      `}</style>
    </div> 
  );
};

export default AddEmployee;
