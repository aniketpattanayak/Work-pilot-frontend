import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axiosConfig";
import {
  Layers,
  Plus,
  Save,
  Trash2,
  Globe,
  Mail,
  Database,
  GitBranch,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Clock,
  Timer,
  ChevronRight,
  Activity,
  ExternalLink,
  Hash,
  Laptop,
  User,
  X,
  Rocket,
  Construction,
  ShieldCheck,
} from "lucide-react";

/**
 * FMS DASHBOARD v4.5 - PERMANENT COMING SOON WRAPPER
 * Purpose: Sheet-Triggered Production with Internal Time-Based Chaining.
 * Feature: 100% Logic Preservation with "Coming Soon" Visual Wrapper.
 */
const FmsDashboard = ({ tenantId }) => {
  const [view, setView] = useState("Monitor");
  const [flows, setFlows] = useState([]);
  const [activeInstances, setActiveInstances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // New: State for viewing flow details
  const [selectedFlow, setSelectedFlow] = useState(null);

  // Blueprint Form State: Optimized for Single-Source Triggering
  const [newFlow, setNewFlow] = useState({
    flowName: "",
    googleSheetId: "",
    scriptUrl: "",
    tabName: "",
    uniqueIdentifierColumn: "Order ID",
    nodes: [
      {
        nodeName: "",
        emailColumn: "",
        type: "Action",
        offsetValue: 0,
        offsetUnit: "hours",
        stepIndex: 0,
      },
    ],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [flowRes, instanceRes, empRes] = await Promise.all([
        API.get(`/fms/templates/${tenantId}`),
        API.get(`/fms/instances/${tenantId}`).catch(() => ({ data: [] })),
        API.get(`/superadmin/employees/${tenantId}`),
      ]);

      setFlows(flowRes.data || []);
      setActiveInstances(instanceRes.data || []);

      const staff = Array.isArray(empRes.data)
        ? empRes.data
        : empRes.data?.employees || [];
      setEmployees(staff);
    } catch (err) {
      console.error("Ledger Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addNode = () => {
    const nextIndex = newFlow.nodes.length;
    setNewFlow({
      ...newFlow,
      nodes: [
        ...newFlow.nodes,
        {
          nodeName: "",
          emailColumn: "",
          type: "Action",
          offsetValue: 0,
          offsetUnit: "hours",
          stepIndex: nextIndex,
        },
      ],
    });
  };

  const handleNodeChange = (index, field, value) => {
    const updatedNodes = [...newFlow.nodes];
    updatedNodes[index][field] = value;
    setNewFlow({ ...newFlow, nodes: updatedNodes });
  };

  const saveBlueprint = async () => {
    if (!newFlow.scriptUrl || !newFlow.googleSheetId) {
      return alert(
        "Missing Infrastructure Link: Provide Sheet ID and Apps Script URL."
      );
    }

    try {
      setLoading(true);
      await API.post("/fms/create-template", { ...newFlow, tenantId });
      alert("Factory Blueprint Successfully Deployed!");
      setView("Monitor");
      fetchData();
      setNewFlow({
        flowName: "",
        googleSheetId: "",
        scriptUrl: "",
        tabName: "",
        uniqueIdentifierColumn: "Order ID",
        nodes: [
          {
            nodeName: "",
            emailColumn: "",
            type: "Action",
            offsetValue: 0,
            offsetUnit: "hours",
            stepIndex: 0,
          },
        ],
      });
    } catch (err) {
      alert("SOP Save Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (
      !window.confirm(
        "PERMANENT ACTION: Are you sure you want to delete this master flow blueprint?"
      )
    )
      return;
    try {
      setLoading(true);
      await API.delete(`/fms/template/${flowId}`);
      alert("Blueprint successfully purged.");
      fetchData();
    } catch (err) {
      alert("Deletion failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * VISUAL RETURN: COMING SOON WRAPPER
   * This logic handles the "Coming Soon" display while ensuring 100%
   * of the original code remains in the file for future activation.
   */
  return (
    <div className="w-full h-full min-h-[85vh] relative flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      {/* 1. VISIBLE WRAPPER: COMING SOON UI */}
      <div className="relative max-w-4xl w-full z-[100]">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div className="bg-white border-2 border-slate-200 p-12 md:p-24 rounded-[4rem] shadow-2xl space-y-12 relative overflow-hidden">
          <div className="flex justify-center gap-6 mb-4">
            <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl -rotate-6 animate-pulse">
              <Rocket size={54} className="text-primary" />
            </div>
            <div className="bg-primary p-6 rounded-3xl shadow-2xl rotate-12">
              <Construction size={54} className="text-white" />
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-slate-950 text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              Coming <br /> <span className="text-primary">Soon</span>
            </h1>
            
          </div>

          
        </div>
      </div>

      {/* 2. HIDDEN DATA LAYER: ALL ORIGINAL CODE PRESERVED HERE */}
      <div className="hidden pointer-events-none select-none overflow-hidden h-0 w-0 opacity-0 absolute inset-0">
        {/* EXECUTIVE HEADER (PRESERVED) */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-b-4 border-primary gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-primary/20 p-4 rounded-2xl border border-primary/30 shadow-inner">
              <Layers className="text-primary" size={32} />
            </div>
            <div>
              <h2 className="text-white text-3xl font-black uppercase tracking-tighter">
                Workflow Orchestrator
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                Sheet-Triggered Sequential Automation
              </p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setView("Monitor")}
              className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                view === "Monitor"
                  ? "bg-primary text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Monitor
            </button>
            <button
              onClick={() => setView("Create")}
              className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                view === "Create"
                  ? "bg-primary text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              + Plan New Flow
            </button>
          </div>
        </div>

        {/* CREATE VIEW (PRESERVED) */}
        {view === "Create" ? (
          <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-12 transition-all">
            <div className="space-y-8">
              <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                <Globe className="text-primary" size={20} />
                <h3 className="text-slate-900 font-black uppercase text-sm tracking-widest">
                  Step 0: Google Sheet Connection (The Trigger)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                <input
                  type="text"
                  value={newFlow.flowName}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, flowName: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={newFlow.googleSheetId}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, googleSheetId: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={newFlow.scriptUrl}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, scriptUrl: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={newFlow.uniqueIdentifierColumn}
                  onChange={(e) =>
                    setNewFlow({
                      ...newFlow,
                      uniqueIdentifierColumn: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  value={newFlow.tabName}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, tabName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-8">
              {newFlow.nodes.map((node, idx) => (
                <div key={idx}>
                  <input
                    type="text"
                    value={node.nodeName}
                    onChange={(e) =>
                      handleNodeChange(idx, "nodeName", e.target.value)
                    }
                  />
                  <select
                    value={node.emailColumn}
                    onChange={(e) =>
                      handleNodeChange(idx, "emailColumn", e.target.value)
                    }
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp.email}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button onClick={addNode}>Add Node</button>
            </div>
            <button onClick={saveBlueprint}>Save Blueprint</button>
          </div>
        ) : (
          <div className="space-y-12">
            <section className="space-y-6">
              <Database size={20} />
              {flows.map((flow) => (
                <div key={flow._id}>
                  <span onClick={() => setSelectedFlow(flow)}>
                    {flow.flowName}
                  </span>
                  <button onClick={() => handleDeleteFlow(flow._id)}>
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </section>
            <section className="space-y-6">
              <Activity size={20} />
              {activeInstances.map((instance) => (
                <div key={instance._id}>{instance.orderIdentifier}</div>
              ))}
            </section>
          </div>
        )}

        {/* MODAL (PRESERVED) */}
        {selectedFlow && (
          <div className="fixed inset-0 bg-slate-950/90 z-[9999]">
            <button onClick={() => setSelectedFlow(null)}>
              <X size={32} />
            </button>
            {selectedFlow.nodes.map((node, i) => (
              <div key={i}>{node.nodeName}</div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default FmsDashboard;
