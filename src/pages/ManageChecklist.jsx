import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; 
import { 
  Trash2, 
  Edit3, 
  RefreshCcw, 
  User, 
  Calendar, 
  Save, 
  X, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Search,
  Building2,
  FileText,
  Target,
  ChevronDown
} from 'lucide-react';

/**
 * MANAGE CHECKLIST v4.5
 * Purpose: Professional Excel-Style Management Ledger.
 * Layout: Strict High-Density Grid, Dark Fonts, Dropdown Timeline.
 */
const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({ doerId: '', taskName: '', description: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const frequencyTabs = ['All', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

  /**
   * EXCEL LOGIC: CALCULATE FUTURE SCHEDULE
   */
  const getNextFiveDates = (startDate, frequency) => {
    if (!startDate) return [];
    const dates = [];
    let current = new Date(startDate);
    
    for (let i = 0; i < 5; i++) {
      dates.push(new Date(current).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
      
      if (frequency === 'Daily') current.setDate(current.getDate() + 1);
      else if (frequency === 'Weekly') current.setDate(current.getDate() + 7);
      else if (frequency === 'Monthly') current.setMonth(current.getMonth() + 1);
      else if (frequency === 'Quarterly') current.setMonth(current.getMonth() + 3);
      else if (frequency === 'Half-Yearly') current.setMonth(current.getMonth() + 6);
      else if (frequency === 'Yearly') current.setFullYear(current.getFullYear() + 1);
      else break;
    }
    return dates;
  };

  /**
   * DATA ACQUISITION
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkRes, empRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);

      const checkData = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []);
      const empDataRaw = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || []);

      setChecklists(checkData);
      setEmployees(empDataRaw.filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * FILTER ENGINE
   */
  const filteredChecklists = checklists.filter(item => {
    const matchesSearch = 
      item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.doerId?.department || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'All' || item.frequency === activeTab;
    const matchesDate = !selectedDate || (item.nextDueDate && 
      new Date(item.nextDueDate).toDateString() === new Date(selectedDate).toDateString());

    return matchesSearch && matchesTab && matchesDate;
  });

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingId(item._id);
    setEditData({ 
      doerId: item.doerId?._id || item.doerId, 
      taskName: item.taskName,
      description: item.description || ''
    });
  };

  const handleUpdate = async (id, e) => {
    e.stopPropagation();
    try {
      await API.put(`/tasks/checklist-update/${id}`, editData);
      alert("Success: Ledger updated.");
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id, taskName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${taskName}" from Registry?`)) return;
    try {
        await API.delete(`/tasks/checklist/${id}`);
        fetchData(); 
    } catch (err) {
        alert("Node deletion error.");
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-primary" size={50} />
      <p className="text-slate-950 font-black text-sm tracking-[0.4em] uppercase">Opening Ledger...</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto animate-in fade-in duration-700 pb-20 px-4 selection:bg-primary/30">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-slate-950 p-4 rounded-xl shadow-lg">
            <ClipboardList className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-slate-950 text-3xl font-black tracking-tighter uppercase leading-none">Task Registry</h2>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mt-1">Master High-Density Operational Grid</p>
          </div>
        </div>
        <button onClick={fetchData} className="bg-white hover:bg-slate-50 border-2 border-slate-950 px-8 py-3 rounded-xl text-slate-950 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-md active:scale-95">
          <RefreshCcw size={18} /> Sync Data
        </button>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-200">
        <div className="relative">
          <input 
            type="text"
            placeholder="Filter by Task, Personnel, or Dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 text-slate-950 px-12 py-3 rounded-2xl outline-none focus:border-slate-950 transition-all font-black text-sm"
          />
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 text-slate-950 px-12 py-3 rounded-2xl outline-none font-black text-xs uppercase"
          />
          <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200 overflow-x-auto custom-scrollbar">
          {frequencyTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-400 hover:text-slate-950'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* STRICT EXCEL GRID TABLE */}
      <div className="bg-white border-2 border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-200 text-xs font-black text-slate-950 uppercase tracking-widest">
                <th className="px-5 py-5 border-r border-slate-200 text-center w-20">NO.</th>
                <th className="px-5 py-5 border-r border-slate-200">TASK IDENTITY</th>
                <th className="px-5 py-5 border-r border-slate-200">DEPT.</th>
                <th className="px-5 py-5 border-r border-slate-200">PERSONNEL</th>
                <th className="px-5 py-5 border-r border-slate-200 min-w-[400px]">OPERATIONAL DESCRIPTION</th>
                <th className="px-5 py-5 border-r border-slate-200">CYCLE</th>
                <th className="px-5 py-5 border-r border-slate-200">FUTURE SCHEDULE</th>
                <th className="px-5 py-5 text-right pr-10">GRID ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {filteredChecklists.map((item, index) => {
                const isEditing = editingId === item._id;
                const schedule = getNextFiveDates(item.nextDueDate, item.frequency);

                return (
                  <tr key={item._id} className={`transition-all ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    
                    {/* ID */}
                    <td className="px-5 py-4 border-r border-slate-200 text-center text-xs font-black text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </td>

                    {/* TASK NAME */}
                    <td className="px-5 py-4 border-r border-slate-200">
                      {isEditing ? (
                        <input 
                          value={editData.taskName} 
                          onChange={(e) => setEditData({...editData, taskName: e.target.value})}
                          className="w-full border-2 border-slate-950 p-2 rounded font-black text-sm uppercase text-slate-950"
                        />
                      ) : (
                        <span className="font-black text-slate-950 text-sm uppercase leading-tight block">
                          {item.taskName}
                        </span>
                      )}
                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-5 py-4 border-r border-slate-200">
                       <span className="text-xs font-black uppercase text-slate-950 whitespace-nowrap">
                         {item.doerId?.department || 'OPERATIONS'}
                       </span>
                    </td>

                    {/* PERSONNEL */}
                    <td className="px-5 py-4 border-r border-slate-200">
                      {isEditing ? (
                        <select 
                          value={editData.doerId} 
                          onChange={(e) => setEditData({...editData, doerId: e.target.value})}
                          className="w-full border-2 border-slate-950 p-2 rounded font-black text-xs uppercase"
                        >
                          {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center"><User size={12} className="text-white" /></div>
                           <span className="text-slate-950 font-black text-sm uppercase whitespace-nowrap">{item.doerId?.name || 'UNMAPPED'}</span>
                        </div>
                      )}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-5 py-4 border-r border-slate-200">
                      {isEditing ? (
                        <textarea 
                          value={editData.description} 
                          onChange={(e) => setEditData({...editData, description: e.target.value})}
                          className="w-full border-2 border-slate-950 p-2 rounded text-sm font-bold text-slate-950 h-20"
                        />
                      ) : (
                        <p className="text-slate-950 text-sm font-bold leading-relaxed italic">
                          {item.description || "Operational briefings not provided."}
                        </p>
                      )}
                    </td>

                    {/* FREQUENCY */}
                    <td className="px-5 py-4 border-r border-slate-200 text-center">
                      <span className="text-slate-950 text-[10px] font-black uppercase tracking-widest border-2 border-slate-950 px-3 py-1 rounded">
                        {item.frequency}
                      </span>
                    </td>

                    {/* EXCEL DROPDOWN TIMELINE */}
                    <td className="px-5 py-4 border-r border-slate-200">
                       <div className="relative group">
                          <select className="w-full bg-slate-100 border-2 border-slate-300 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-lg appearance-none cursor-pointer hover:border-slate-950 transition-all">
                             {schedule.map((date, dIdx) => (
                               <option key={dIdx} className="font-bold py-2">
                                 {dIdx === 0 ? `→ ${date}` : `• ${date}`}
                               </option>
                             ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-950 pointer-events-none group-hover:scale-110 transition-transform" />
                       </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4 text-right pr-10">
                      <div className="flex justify-end gap-3">
                        {isEditing ? (
                          <>
                            <button onClick={(e) => handleUpdate(item._id, e)} className="p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg"><Save size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-3 bg-slate-200 text-slate-950 rounded-lg"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => handleEditClick(item, e)} className="p-3 bg-slate-900 text-white rounded-lg hover:bg-black transition-all"><Edit3 size={16} /></button>
                            <button onClick={(e) => handleDelete(item._id, item.taskName, e)} className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        
        /* Rigid Excel Grid Simulation */
        table { border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; }
        thead th { background-color: #f8fafc; border-bottom: 2px solid #000; }
      `}</style>
    </div>
  );
};

export default ManageChecklist;