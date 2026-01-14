import React, { useEffect, useState, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance for AWS compatibility
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
  AlertCircle 
} from 'lucide-react';

const ManageChecklist = ({ tenantId }) => {
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({ doerId: '', taskName: '' });

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'checklists' and 'employees' are always arrays to prevent UI crashes.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Using Promise.all with the centralized API instance
      const [checkRes, empRes] = await Promise.all([
        API.get(`/tasks/checklist-all/${currentTenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${currentTenantId}`).catch(() => ({ data: [] }))
      ]);

      // Safety: Unwrap data if backend returns an object { data: [...] } or { employees: [...] }
      const checkData = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data?.data || []);
      const empDataRaw = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || empRes.data?.data || []);

      setChecklists(checkData);
      
      // Safety: Filter employees only if we have a valid array
      setEmployees(empDataRaw.filter(e => {
        const roles = Array.isArray(e.roles) ? e.roles : [e.role || ''];
        return roles.some(r => r === 'Doer' || r === 'Admin');
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setChecklists([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData({ 
        doerId: item.doerId?._id || item.doerId, 
        taskName: item.taskName 
    });
  };

  const handleUpdate = async (id) => {
    try {
      // Switched to centralized API instance
      await API.put(`/tasks/checklist-update/${id}`, editData);
      alert("Checklist configuration updated!");
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Terminate routine: "${name}"?`)) {
      try {
        // Switched to centralized API instance
        await API.delete(`/tasks/checklist-delete/${id}`);
        fetchData();
      } catch (err) {
        alert("Deletion failed.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <p className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Accessing Task Registry...</p>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20">
            <ClipboardList className="text-sky-400" size={32} />
          </div>
          <div>
            <h2 className="text-white text-3xl font-black tracking-tighter">Manage Recurring Routines</h2>
            <p className="text-slate-500 text-sm font-medium">Reconfigure active factory checklists and triggers.</p>
          </div>
        </div>
        <button onClick={fetchData} className="group bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl text-slate-300 font-bold text-sm transition-all flex items-center gap-3 active:scale-95">
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Sync Registry
        </button>
      </div>

      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-8 py-5 bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 border-b-0 font-black text-slate-500 text-[10px] uppercase tracking-widest">
        <div>Task Designation</div>
        <div>Assigned Personnel</div>
        <div>Frequency</div>
        <div>Next Check-Point</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
        {/* FIX: Safe Map call with Array check */}
        {Array.isArray(checklists) && checklists.map(item => {
          const isEditing = editingId === item._id;
          return (
            <div key={item._id} className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] items-center px-8 py-6 border-b border-slate-800/50 last:border-0 group ${isEditing ? 'bg-sky-500/5' : 'hover:bg-slate-900/30'}`}>
              {isEditing ? (
                <>
                  <div className="pr-4">
                    <input 
                        type="text" 
                        value={editData.taskName} 
                        onChange={(e) => setEditData({...editData, taskName: e.target.value})} 
                        className="w-full bg-slate-900 border border-sky-500/40 text-white px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all" 
                    />
                  </div>
                  <div className="pr-4">
                    <select 
                        value={editData.doerId} 
                        onChange={(e) => setEditData({...editData, doerId: e.target.value})} 
                        className="w-full bg-slate-900 border border-sky-500/40 text-white px-4 py-2.5 rounded-xl text-sm font-bold outline-none cursor-pointer"
                    >
                      {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div className="text-slate-500 text-xs font-black uppercase tracking-widest">{item.frequency || 'N/A'}</div>
                  <div className="text-slate-500 text-xs font-bold">
                    {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'Pending'}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleUpdate(item._id)} className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-90"><Save size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl border border-slate-700 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-90"><X size={18} /></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20"><CheckCircle2 size={16} className="text-sky-400" /></div>
                    <span className="font-bold text-slate-100 tracking-tight">{item.taskName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800"><User size={12} className="text-sky-500" /></div>
                    {item.doerId?.name || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-600" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{item.frequency || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-slate-600" />
                    <span className="text-slate-400 text-xs font-bold">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(item)} className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-90"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(item._id, item.taskName)} className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90"><Trash2 size={18} /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {(!checklists || checklists.length === 0) && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30 grayscale">
            <ClipboardList size={64} /><p className="font-black text-xs uppercase tracking-[0.3em]">No Active Routines Found</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageChecklist;