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




  const [showHistory, setShowHistory] = useState(false);
const [historyData, setHistoryData] = useState([]);
const [selectedInstance, setSelectedInstance] = useState(null);
const [flowHistory, setFlowHistory] = useState([]);
const [showFlowHistory, setShowFlowHistory] = useState(false);



const openHistory = async (instanceId) => {
  try {
    const res = await API.get(`/fms/history/${instanceId}`);
    setHistoryData(res.data);
    setSelectedInstance(instanceId);
    setShowHistory(true);
  } catch (err) {
    console.error("History fetch failed", err);
  }
};
/*
const groupByStep = (history) => {
  const grouped = {};

  history.forEach(h => {
    if (!grouped[h.stepIndex]) {
      grouped[h.stepIndex] = {
        stepIndex: h.stepIndex,
        nodeName: h.nodeName,
        logs: []
      };
    }

    grouped[h.stepIndex].logs.push(h);
  });

  return Object.values(grouped).sort((a,b)=>a.stepIndex-b.stepIndex);
};
*/

const groupByStep = (history) => {
  const grouped = {};

  history.forEach(h => {
    const key = `${h.stepIndex}_${h.orderIdentifier}`; // 🔥 FIX

    if (!grouped[key]) {
      grouped[key] = {
        stepIndex: h.stepIndex,
        nodeName: h.nodeName,
        orderIdentifier: h.orderIdentifier,
        logs: []
      };
    }

    grouped[key].logs.push(h);
  });

  return Object.values(grouped).sort((a,b)=>a.stepIndex-b.stepIndex);
};

const openFlowHistory = async (flowId) => {
  const res = await API.get(`/fms/history/flow/${flowId}`);
  //setFlowHistory(groupByStep(res.data));
  setFlowHistory(res.data);
  setShowFlowHistory(true);
  console.log(res.data);
};

/*
const delayCount = logs.filter(l => l.action === "DELAYED").length;
const avgTime = (logs) => {
  const completed = logs.filter(l => l.action === "COMPLETED");

  if (!completed.length) return 0;

  const total = completed.reduce((acc, l) => {
    return acc + (l.newValue?.delay || 0);
  }, 0);

  return (total / completed.length).toFixed(2);
};

const performance = {};

logs.forEach(l => {
  if (!l.performedBy) return;

  if (!performance[l.performedBy]) {
    performance[l.performedBy] = {
      completed: 0,
      delayed: 0
    };
  }

  if (l.action === "COMPLETED") performance[l.performedBy].completed++;
  if (l.action === "DELAYED") performance[l.performedBy].delayed++;
});

const isBottleneck = (logs) => {
  const delayed = logs.filter(l => l.action === "DELAYED").length;
  return delayed > logs.length * 0.3; // 30% delay threshold
};




*/



const syncAllFlows = async () => {
  try {
    if (!flows.length) return;

    console.log("🔄 Auto syncing flows...");

    await Promise.all(
      flows.map(flow =>
        API.get(`/fms/sync/${flow._id}`)
      )
    );

    console.log("✅ All flows synced");

    // optional refresh
    fetchData();

  } catch (err) {
    console.error("Auto Sync Failed:", err);
  }
};

useEffect(() => {
  const interval = setInterval(() => {
    syncAllFlows();
  }, 60000); // every 1 min

  return () => clearInterval(interval);
}, [flows]); // important






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
        sheetColumn: "",
        type: "Action",
        offsetValue: 0,
        offsetUnit: "hours",
        stepIndex: 0,
      },
    ],

    workingHours: {
        start: 9,
        end: 17
    },
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
          sheetColumn: "",
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


  /*
  const saveBlueprint = async () => {
    if (!newFlow.scriptUrl || !newFlow.googleSheetId) {
      return alert(
        "Missing Infrastructure Link: Provide Sheet ID and Apps Script URL."
      );
    }

    try {
      setLoading(true);
      console.log("SENDING FLOW:", newFlow);
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
  */

  const saveBlueprint = async () => {
  // VALIDATION
  if (!newFlow.flowName || !newFlow.googleSheetId || !newFlow.scriptUrl) {
    return alert("Fill all required fields");
  }

  for (const node of newFlow.nodes) {
    if (!node.nodeName || !node.emailColumn || !node.sheetColumn) {
      return alert("Each step must have name, email, and sheet column");
    }
  }

  // CLEAN DATA
  const cleanedFlow = {
    ...newFlow,
    googleSheetId: newFlow.googleSheetId.replace(/\s+/g, ""),
    scriptUrl: newFlow.scriptUrl.trim(),
    tabName: newFlow.tabName.trim(),
    nodes: newFlow.nodes.map(node => ({
      ...node,
      nodeName: node.nodeName.trim(),
      emailColumn: node.emailColumn.trim(),
      sheetColumn: node.sheetColumn.trim(),
    })),
  };

  try {
    setLoading(true);

    await API.post("/fms/create-template", { ...cleanedFlow, tenantId });

    alert("Factory Blueprint Successfully Deployed!");
    setView("Monitor");
    fetchData();

    // RESET
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
          sheetColumn: "",
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

/**   
  return (
  
    <div className="w-full h-full min-h-[85vh] relative flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      {/* 1. VISIBLE WRAPPER: COMING SOON UI */
      /*<div className="relative max-w-4xl w-full z-[100]">
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
      </div>*
      






      <div className="pointer-events-none select-none overflow-hidden h-1000 w-200 opacity-100 absolute inset-0">
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

  
*/


  /*return (
  <div className="w-full h-full min-h-[85vh] relative flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">

    <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-b-4 border-primary gap-6 w-full max-w-6xl">
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

    <div className="w-full max-w-6xl mt-10">

      {view === "Create" ? (
        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-12 transition-all">

          <div className="space-y-8">
            <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
              <Globe className="text-primary" size={20} />
              <h3 className="text-slate-900 font-black uppercase text-sm tracking-widest">
                Step 0: Google Sheet Connection
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
              <input
  placeholder="Flow Name"
  value={newFlow.flowName}
  onChange={(e)=>setNewFlow({...newFlow, flowName:e.target.value})}
/>
              <input value={newFlow.googleSheetId} onChange={(e)=>setNewFlow({...newFlow, googleSheetId:e.target.value})}/>
              <input value={newFlow.scriptUrl} onChange={(e)=>setNewFlow({...newFlow, scriptUrl:e.target.value})}/>
              <input value={newFlow.uniqueIdentifierColumn} onChange={(e)=>setNewFlow({...newFlow, uniqueIdentifierColumn:e.target.value})}/>
              <input value={newFlow.tabName} onChange={(e)=>setNewFlow({...newFlow, tabName:e.target.value})}/>
              <input
  placeholder="Sheet Column Name"
  value={node.sheetColumn || ""}
  onChange={(e)=>handleNodeChange(idx,"sheetColumn",e.target.value)}
/>
            </div>
          </div>

          <div className="space-y-8">
            {newFlow.nodes.map((node, idx) => (
              <div key={idx}>
                <input
                  value={node.nodeName}
                  onChange={(e)=>handleNodeChange(idx,"nodeName",e.target.value)}
                />
                <select
                  value={node.emailColumn}
                  onChange={(e)=>handleNodeChange(idx,"emailColumn",e.target.value)}
                >
                  {employees.map(emp => (
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
            {flows.map(flow => (
              <div key={flow._id}>
                <span onClick={()=>setSelectedFlow(flow)}>
                  {flow.flowName}
                </span>
                <button onClick={()=>handleDeleteFlow(flow._id)}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </section>

          <section className="space-y-6">
            <Activity size={20} />
            {activeInstances.map(instance => (
              <div key={instance._id}>
                {activeInstances.map(instance => {
  const currentStep = instance.steps.find(
    s => s.stepIndex === instance.currentStepIndex
  );

  return (
    <div key={instance._id} className="border p-4 rounded">
      <p><b>Order:</b> {instance.orderIdentifier}</p>
      <p><b>Current Step:</b> {currentStep?.nodeName}</p>
      <p><b>Status:</b> {currentStep?.status}</p>
      <p><b>Deadline:</b> {currentStep?.plannedDeadline}</p>
    </div>
  );
})}
              </div>
            ))}
          </section>

        </div>
      )}
      <button onClick={async ()=>{
  await API.put(`/fms/execute-step/${instance._id}`);
  fetchData();
}}>
  Mark Done
</button>
    </div>

    {selectedFlow && (
      <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col items-center justify-center">
        <button onClick={()=>setSelectedFlow(null)}>
          <X size={32} />
        </button>

        {selectedFlow.nodes.map((node,i)=>(
          <div key={i}>{node.nodeName}</div>
        ))}
      </div>
    )}

  </div>
);*/



/** 
return (
 <div className="w-full h-full min-h-[85vh] relative flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">

    {loading && (
  <div className="text-white bg-slate-800 px-4 py-2 rounded mb-4">
    Loading...
  </div>
)}

    <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-b-4 border-primary gap-6 w-full max-w-6xl">
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

    <div className="w-full max-w-6xl mt-10">

      {view === "Create" ? (
        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-12">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50 p-8 rounded-[2rem]">
            <input placeholder="Flow Name"
              value={newFlow.flowName}
              onChange={(e)=>setNewFlow({...newFlow, flowName:e.target.value})}
            />
            <input placeholder="Google Sheet ID"
              value={newFlow.googleSheetId}
              onChange={(e)=>setNewFlow({...newFlow, googleSheetId:e.target.value})}
            />
            <input placeholder="Apps Script URL"
              value={newFlow.scriptUrl}
              onChange={(e)=>setNewFlow({...newFlow, scriptUrl:e.target.value})}
            />
            <input placeholder="Unique ID Column"
              value={newFlow.uniqueIdentifierColumn}
              onChange={(e)=>setNewFlow({...newFlow, uniqueIdentifierColumn:e.target.value})}
            />
            <input placeholder="Tab Name"
              value={newFlow.tabName}
              onChange={(e)=>setNewFlow({...newFlow, tabName:e.target.value})}
            />
          </div>

          <div className="space-y-6">
            {newFlow.nodes.map((node, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <input
                  placeholder="Step Name"
                  value={node.nodeName}
                  onChange={(e)=>handleNodeChange(idx,"nodeName",e.target.value)}
                />

                <input
                  placeholder="Sheet Column"
                  value={node.sheetColumn || ""}
                  onChange={(e)=>handleNodeChange(idx,"sheetColumn",e.target.value)}
                />

                <select
  value={node.emailColumn || ""}
  onChange={(e)=>handleNodeChange(idx,"emailColumn",e.target.value)}
>
  <option value="">Select Employee</option>
  {employees.map(emp => (
    <option key={emp._id} value={emp.email}>
      {emp.name}
    </option>
  ))}
</select>
                <input
                  type="number"
                  placeholder="Offset"
                  value={node.offsetValue}
                  onChange={(e)=>handleNodeChange(idx,"offsetValue",e.target.value)}
                />

              </div>
            ))}
            <button onClick={addNode}>Add Node</button>
          </div>

          <button onClick={saveBlueprint}>Save Blueprint</button>
        </div>

      ) : (

      <div className="space-y-12">

        <section className="space-y-4">
          <Database size={20} />
          {flows.map(flow => (
  <div key={flow._id} className="flex justify-between border p-3 rounded items-center">

    <span onClick={()=>setSelectedFlow(flow)}>
      {flow.flowName}
    </span>

    <div className="flex gap-2">

      <button
        className="bg-green-600 text-white px-3 py-1 rounded text-xs"
        onClick={async ()=>{
          await API.post("/fms/start-flow", {
            templateId: flow._id,
            tenantId,
            orderIdentifier: "TEST-" + Date.now()
          });
          fetchData();
        }}
      >
        Start
      </button>

      <button
        className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
        onClick={async ()=>{
          await API.get(`/fms/sync/${flow._id}`);
          fetchData();
        }}
      >
        Sync
      </button>

      <button onClick={()=>handleDeleteFlow(flow._id)}>
        <Trash2 size={18} />
      </button>

    </div>
  </div>
))}
        </section>

        <section className="space-y-4">
          <Activity size={20} />
          {activeInstances.length === 0 && (
  <p className="text-slate-400">No active flows yet</p>
)}

          {activeInstances.map(instance => {
            const currentStep = instance.steps.find(
              s => s.stepIndex === instance.currentStepIndex
            );

            return (
              <div key={instance._id} className="border p-4 rounded space-y-2">

                <p><b>Order:</b> {instance.orderIdentifier}</p>
                <p><b>Step:</b> {currentStep?.nodeName}</p>
                <p>
  <b>Status:</b>{" "}
  <span className={
    currentStep?.status === "Completed"
      ? "text-green-600 font-bold"
      : currentStep?.status === "Delayed"
      ? "text-red-600 font-bold"
      : "text-yellow-600 font-bold"
  }>
    {currentStep?.status}
  </span>
</p>
                <p>
  <b>Deadline:</b>{" "}
  {currentStep?.plannedDeadline
    ? new Date(currentStep.plannedDeadline).toLocaleString()
    : "Not Set"}
</p>

                {/*!instance.isFullyCompleted && (
                  <button
                    className="mt-2 bg-primary text-white px-4 py-1 rounded"
                    onClick={async ()=>{
                      await API.put(`/fms/execute-step/${instance._id}`);
                      fetchData();
                    }}
                  >
                    Mark Done
                  </button>
                )**********************

                {/*<button
  className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
  onClick={async ()=>{
    await API.get(`/fms/sync/${flows._id}`);
    fetchData();
  }}
>
  Sync Sheet
</button>******************************

              </div>
            );
          })}

        </section>

      </div>
      )}
    </div>
    {selectedFlow && (
      <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col items-center justify-center">
        <button onClick={()=>setSelectedFlow(null)}>
          <X size={32} />
        </button>

        {selectedFlow.nodes.map((node,i)=>(
          <div key={i}>{node.nodeName}</div>
        ))}
      </div>
    )}

  </div>
);*/



const formatInstances = (instances) => {
  return instances.map((inst) => {
    const currentStep = inst.steps.find(
      s => s.stepIndex === inst.currentStepIndex
    );

    return {
      id: inst._id,
      order: inst.orderIdentifier,
      step: currentStep?.nodeName,
      customer: inst.sheetDataId?.rawData?.["Customer Name"] || "-",
item: inst.sheetDataId?.rawData?.["Item Name"] || "-",
qty: inst.sheetDataId?.rawData?.["Entered Qty"] || "-",
po: inst.sheetDataId?.rawData?.["PO Number"] || "-",
      decision: currentStep?.decision || "—",
      completedAt: currentStep?.actualCompletedAt || null,
      status: currentStep?.status,
      deadline: currentStep?.plannedDeadline
    };
  });
};



//const data = formatInstances(activeInstances || []);
const data = formatInstances(activeInstances || []).filter((row) => {
  if (!row.order) return false;

  // Example: split by "-" OR length check
  const parts = row.order.split("");

  return parts.length >= 2; // 🔥 your rule
});


return (
  <div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center px-4 md:px-8 py-8 gap-10">

    {loading && (
      <div className="text-white bg-slate-800 px-4 py-2 rounded-lg shadow">
        Loading...
      </div>
    )}

    {/* HEADER */}
    <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 backdrop-blur-xl bg-card border border-border p-6 md:p-8 rounded-3xl shadow-xl">

      <div className="flex items-center gap-4">
        <div className="bg-primary/20 p-4 rounded-2xl bg-card border border-border">
          <Layers className="text-primary" size={30} />
        </div>

        <div>
          <h2 className="text-xs font-bold text-primary text-2xl md:text-3xl font-black tracking-tight">
            Workflow Orchestrator
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">
            Sheet-Triggered Automation
          </p>
        </div>
      </div>

      <div className="flex bg-white/10 p-1.5 rounded-2xl">
        <button
          onClick={() => setView("Monitor")}
          className={`px-6 py-2 rounded-xl text-xs font-bold tracking-wider transition ${
            view === "Monitor"
              ? "bg-primary text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Active Monitor
        </button>

        <button
          onClick={() => setView("Create")}
          className={`px-6 py-2 rounded-xl text-xs font-bold tracking-wider transition ${
            view === "Create"
              ? "bg-primary text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          + Plan Flow
        </button>
      </div>
    </div>

    <div className="w-full max-w-6xl">
      {view === "Create" ? (
 <div className="w-full max-w-7xl mx-auto space-y-10">

  {/* ================= HEADER ================= */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
        🚀 Create Workflow
      </h1>
      <p className="text-sm text-slate-500 mt-1">
        Design and automate your pipeline visually
      </p>
    </div>

    <button
      onClick={saveBlueprint}
      className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition"
    >
      💾 Save Flow
    </button>
  </div>

  {/* ================= CONFIG ================= */}
  <div className="bg-white border rounded-2xl p-8 shadow-lg space-y-8">

    <h2 className="text-lg font-bold text-slate-700">
      ⚙️ Flow Configuration
    </h2>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

      {/* Flow Name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Flow Name
        </label>
        <input
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={newFlow.flowName}
          onChange={(e)=>setNewFlow({...newFlow, flowName:e.target.value})}
        />
      </div>

      {/* Sheet ID */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Google Sheet ID
        </label>
        <input
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={newFlow.googleSheetId}
          onChange={(e)=>setNewFlow({...newFlow, googleSheetId:e.target.value})}
        />
      </div>

      {/* Script URL */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Apps Script URL  
        </label>
        <input
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
          value={newFlow.scriptUrl}
          onChange={(e)=>setNewFlow({...newFlow, scriptUrl:e.target.value})}
        />
      </div>

      {/* Unique ID */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Unique Identifier Column
        </label>
        <input
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={newFlow.uniqueIdentifierColumn}
          onChange={(e)=>setNewFlow({...newFlow, uniqueIdentifierColumn:e.target.value})}
        />
      </div>

      {/* Tab Name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Sheet Tab Name
        </label>
        <input
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={newFlow.tabName}
          onChange={(e)=>setNewFlow({...newFlow, tabName:e.target.value})}
        />
      </div>

      {/* Working Hours */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">
          Working Hours
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start"
            value={newFlow.workingHours.start}
            onChange={(e)=>setNewFlow({
              ...newFlow,
              workingHours:{
                ...newFlow.workingHours,
                start:Number(e.target.value)
              }
            })}
          />
          <input
            type="number"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End"
            value={newFlow.workingHours.end}
            onChange={(e)=>setNewFlow({
              ...newFlow,
              workingHours:{
                ...newFlow.workingHours,
                end:Number(e.target.value)
              }
            })}
          />
        </div>
      </div>

    </div>
  </div>

  {/* ================= STEPS ================= */}
  <div className="space-y-6">

    <div className="flex justify-between items-center">
      <h2 className="text-lg font-bold text-slate-700">
        🔄 Workflow Steps
      </h2>

      <button
        onClick={addNode}
        className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg shadow hover:scale-105 transition"
      >
        + Add Step
      </button>
    </div>

    <div className="space-y-6">

      {newFlow.nodes.map((node, idx) => (
        <div key={idx} className="relative flex gap-5">

          {/* Connector */}
          {idx !== newFlow.nodes.length - 1 && (
            <div className="absolute left-6 top-14 h-full w-[2px] bg-slate-200" />
          )}

          {/* Step Circle */}
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg">
            {idx + 1}
          </div>

          {/* Card */}
          <div className="flex-1 bg-white border rounded-2xl p-6 shadow-md hover:shadow-xl transition space-y-5">

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">
                {node.nodeName || `Step ${idx + 1}`}
              </h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Step Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Step Name</label>
                <input
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={node.nodeName}
                  onChange={(e)=>handleNodeChange(idx,"nodeName",e.target.value)}
                />
              </div>

              {/* Column */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Sheet Column</label>
                <input
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={node.sheetColumn || ""}
                  onChange={(e)=>handleNodeChange(idx,"sheetColumn",e.target.value)}
                />
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Assign Employee</label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={node.emailColumn || ""}
                  onChange={(e)=>handleNodeChange(idx,"emailColumn",e.target.value)}
                >
                  <option value="">Select</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp.email}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Offset */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Offset (hrs)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={node.offsetValue}
                  onChange={(e)=>handleNodeChange(idx,"offsetValue",e.target.value)}
                />
              </div>

              {/* Input Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Input Type</label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm 
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={node.inputType || "complete"}
                  onChange={(e)=>handleNodeChange(idx,"inputType",e.target.value)}
                >
                  <option value="complete">✔ Complete / Pending</option>
                  <option value="yesno">❓ Yes / No</option>
                </select>
              </div>

            </div>
          </div>

        </div>
      ))}

    </div>
  </div>

</div>
) : (

   <div className="space-y-10">

          <section className="space-y-4">
            <div className="flex items-center gap-2 bg-card font-semibold">
              <Database size={18} /> Flows
            </div>


<div className="w-full overflow-x-auto rounded-2xl border border-border shadow-lg bg-card">

  <table className="min-w-full text-sm">

    {/* HEADER */}
    <thead className="bg-muted/50 backdrop-blur sticky top-0 z-10">
      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
        <th className="p-4">Flow</th>
        <th className="p-4">Pipeline</th>
        <th className="p-4">Working Hours</th>
        <th className="p-4">Status</th>
        <th className="p-4 text-right">Actions</th>
      </tr>
    </thead>

    {/* BODY */}
    <tbody>
      {flows.map((flow) => (
        <tr
          key={flow._id}
          className="border-t border-border hover:bg-muted/40 transition group"
        >

          {/* FLOW NAME */}
          <td
            className="p-4 cursor-pointer"
            onClick={() => openFlowHistory(flow._id)}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-primary group-hover:underline">
                {flow.flowName}
              </span>
              <span className="text-xs text-slate-400">
                {flow.nodes?.length || 0} steps
              </span>
            </div>
          </td>

          {/* PIPELINE VIEW */}
          <td className="p-4">
            <div className="flex items-center gap-2 flex-wrap">

              {flow.nodes?.slice(0, 4).map((node, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1"
                >
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                    {node.nodeName}
                  </span>

                  {i < flow.nodes.length - 1 && (
                    <ChevronRight size={14} className="text-slate-400" />
                  )}
                </div>
              ))}

              {flow.nodes?.length > 4 && (
                <span className="text-xs text-slate-400">
                  +{flow.nodes.length - 4} more
                </span>
              )}
            </div>
          </td>

          {/* WORKING HOURS */}
          <td className="p-4 text-slate-600">
            <span className="flex items-center gap-1 text-xs">
              <Clock size={14} />
              {flow?.workingHours?.start}:00 - {flow?.workingHours?.end}:00
            </span>
          </td>

          {/* STATUS */}
          <td className="p-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              <CheckCircle2 size={14} />
              Active
            </span>
          </td>

          {/* ACTIONS */}
          <td className="p-4">
            <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition">

              <button
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition shadow"
                onClick={async () => {
                  await API.post("/fms/start-flow", {
                    templateId: flow._id,
                    tenantId,
                    orderIdentifier: "TEST-" + Date.now(),
                  });
                  fetchData();
                }}
              >
                Start
              </button>

              <button
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition shadow"
                onClick={async () => {
                  await API.get(`/fms/sync/${flow._id}`);
                  fetchData();
                }}
              >
                Sync
              </button>

              <button
                className="px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 transition"
                onClick={() => handleDeleteFlow(flow._id)}
              >
                <Trash2 size={16} />
              </button>

            </div>
          </td>

        </tr>
      ))}
    </tbody>

  </table>
</div>
            {/*flows.map(flow => (
              <div key={flow._id} className="flex flex-col md:flex-row justify-between gap-4  p-4 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition">


                <p>
                    <b>Working Hours:</b> {flow?.workingHours?.start}:00 - {flow?.workingHours?.end}:00
                </p>

                

                {/*<span
                  className="font-medium cursor-pointer"
                  //onClick={()=>setSelectedFlow(flow)}
                  onClick={()=>openFlowHistory(flow._id)}
                >
                  {flow.flowName}
                </span>
                }
                <div
  className="flex-1 cursor-pointer"
  onClick={() => openFlowHistory(flow._id)}
>
  <p className="font-medium">{flow.flowName}</p>
</div>

                <div className="flex flex-wrap gap-2">

                  <button
                    className="btn-success"
                    onClick={async ()=>{
          await API.post("/fms/start-flow", {
            templateId: flow._id,
            tenantId,
            orderIdentifier: "TEST-" + Date.now()
          });
          fetchData();
        }}
                  >
                    Start
                  </button>

                  <button
                    className="btn-sync"
                    onClick={async ()=>{
                      const res=await API.get(`/fms/sync/${flow._id}`);
                      fetchData();
                      console.log(res.data);
                    }}
                  >
                    Sync
                  </button>

                  <button onClick={()=>handleDeleteFlow(flow._id)}>
                    <Trash2 size={18} />
                  </button>

                </div>
              </div>
            ))*/}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 bg-card font-semibold">
              <Activity size={18} /> Active Instances
            </div>

            {activeInstances.length === 0 && (
              <p className="text-slate-400 text-sm italic">
                No active flows yet
              </p>
            )}

            {/*activeInstances.map(instance => {
              const currentStep = instance.steps.find(
                s => s.stepIndex === instance.currentStepIndex
              );
              return (
                <div key={instance._id} className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition">

                  <p><b>Order:</b> {instance.orderIdentifier}</p>
                  <p><b>Step:</b> {currentStep?.nodeName}</p>


                  <p><b>Customer:</b> {instance.sheetDataId?.rawData?.["Customer Name"]}</p>
<p><b>Item:</b> {instance.sheetDataId?.rawData?.["Item Name"]}</p>
<p><b>Qty:</b> {instance.sheetDataId?.rawData?.["Entered Qty"]}</p>
<p><b>PO:</b> {instance.sheetDataId?.rawData?.["PO Number"]}</p>






                  <p><b>Remarks:</b> {currentStep?.remarks || "—"}</p>
                  <p><b>Decision:</b> {currentStep?.decision || "—"}</p>
                  <p><b>Completed At:</b> {
                          currentStep?.actualCompletedAt 
                              ? new Date(currentStep.actualCompletedAt).toLocaleString() 
                              : "—"
                  }</p>

                  <p>
                    <b>Status:</b>{" "}
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      currentStep?.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : currentStep?.status === "Delayed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {currentStep?.status}
                    </span>
                  </p>

                  <p>
                    <b>Deadline:</b>{" "}
                    {currentStep?.plannedDeadline
                      ? new Date(currentStep.plannedDeadline).toLocaleString()
                      : "Not Set"}
                  </p>


                  <button
  className="bg-purple-600 text-white px-3 py-1 rounded text-xs mt-2"
  onClick={() => openHistory(instance._id)}
>
  View History
</button>




                </div>
              );




              const data = formatInstances(activeInstances || []);


              <div className="w-full overflow-x-auto">
  <table className="min-w-full border text-sm">

    <thead className="bg-gray-100 sticky top-0">
      <tr>
        <th className="p-2 border">Order</th>
        <th className="p-2 border">Step</th>
        <th className="p-2 border">Customer</th>
        <th className="p-2 border">Item</th>
        <th className="p-2 border">Qty</th>
        <th className="p-2 border">PO</th>
        <th className="p-2 border">Remarks</th>
        <th className="p-2 border">Decision</th>
        <th className="p-2 border">Completed</th>
        <th className="p-2 border">Status</th>
        <th className="p-2 border">Deadline</th>
        <th className="p-2 border">Actions</th>
      </tr>
    </thead>

    <tbody>
      {data.map((row) => (
        <tr key={row.id} className="hover:bg-gray-50">

          <td className="p-2 border">{row.order}</td>
          <td className="p-2 border">{row.step}</td>
          <td className="p-2 border">{row.customer}</td>
          <td className="p-2 border">{row.item}</td>
          <td className="p-2 border">{row.qty}</td>
          <td className="p-2 border">{row.po}</td>
          <td className="p-2 border">{row.remarks}</td>
          <td className="p-2 border">{row.decision}</td>

          <td className="p-2 border">
            {row.completedAt
              ? new Date(row.completedAt).toLocaleString()
              : "—"}
          </td>

          <td className="p-2 border">
            <span className={`px-2 py-1 rounded text-xs ${
              row.status === "Completed"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {row.status}
            </span>
          </td>

          <td className="p-2 border">
            {row.deadline
              ? new Date(row.deadline).toLocaleString()
              : "—"}
          </td>

          <td className="p-2 border">
            <button
              className="text-blue-600"
              onClick={() => openHistory(row.id)}
            >
              View History
            </button>
          </td>

        </tr>
      ))}
    </tbody>
  </table>
</div>



            })*/}
            <div className="w-full overflow-x-auto">
  <table className="min-w-full border text-sm">

    <thead className="bg-gray-100 sticky top-0">
      <tr>
        <th className="p-2 border">Order</th>
        <th className="p-2 border">Step</th>
        <th className="p-2 border">Customer</th>
        <th className="p-2 border">Item</th>
        <th className="p-2 border">Qty</th>
        <th className="p-2 border">PO</th>
        <th className="p-2 border">Remarks</th>
        <th className="p-2 border">Decision</th>
        <th className="p-2 border">Completed</th>
        <th className="p-2 border">Status</th>
        <th className="p-2 border">Deadline</th>
        <th className="p-2 border">Actions</th>
      </tr>
    </thead>

    <tbody>
      {data.map((row) => (
        <tr key={row.id} className="hover:bg-gray-50">

          <td className="p-2 border">{row.order}</td>
          <td className="p-2 border">{row.step}</td>
          <td className="p-2 border">{row.customer}</td>
          <td className="p-2 border">{row.item}</td>
          <td className="p-2 border">{row.qty}</td>
          <td className="p-2 border">{row.po}</td>
          <td className="p-2 border">{row.remarks}</td>
          <td className="p-2 border">{row.decision}</td>

          <td className="p-2 border">
            {row.completedAt
              ? new Date(row.completedAt).toLocaleString()
              : "—"}
          </td>

          <td className="p-2 border">
            <span className={`px-2 py-1 rounded text-xs ${
              row.status === "Completed"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {row.status}
            </span>
          </td>

          <td className="p-2 border">
            {row.deadline
              ? new Date(row.deadline).toLocaleString()
              : "—"}
          </td>

          <td className="p-2 border">
            <button
              className="text-blue-600"
              onClick={() => openHistory(row.id)}
            >
              View History
            </button>
          </td>

        </tr>
      ))}
    </tbody>

  </table>
</div>


          </section>

        </div>
      )}





    </div>

    {selectedFlow && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-6">

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-lg transition">

          <button onClick={()=>setSelectedFlow(null)}>
            <X size={28} />
          </button>

          {selectedFlow.nodes.map((node,i)=>(
            <div key={i} className="border p-2 rounded">
              {node.nodeName}
            </div>
          ))}

        </div>
      </div>
    )}




    {/*showHistory && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    
    <div className="bg-white w-[90%] max-w-5xl p-6 rounded-xl shadow-xl">

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Flow History</h2>
        <button onClick={() => setShowHistory(false)}>X</button>
      </div>

      <div className="overflow-auto max-h-[400px]">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th>Time</th>
              <th>Step</th>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {historyData.map((h, i) => (
              <tr key={i} className="border-b">
                <td>{new Date(h.timestamp).toLocaleString()}</td>
                <td>{h.nodeName}</td>
                <td>{h.action}</td>
                <td>{h.performedBy || "-"}</td>
                <td>
                  {h.newValue
                    ? JSON.stringify(h.newValue)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  </div>
)*/}

{showHistory && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[99999] p-4">

    <div className="bg-card border border-border w-full max-w-6xl rounded-2xl shadow-xl overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-background sticky top-0 z-10">
        <h2 className="text-lg font-bold">
          Instance History
        </h2>

        <button
          className="text-slate-500 hover:text-red-500"
          onClick={() => setShowHistory(false)}
        >
          <X size={22} />
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-auto max-h-[500px]">

        <table className="w-full text-sm border">

          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="p-2 border">Time</th>
              <th className="p-2 border">Order</th>
              <th className="p-2 border">Step</th>
              <th className="p-2 border">Action</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Details</th>
            </tr>
          </thead>

          <tbody>
            {historyData.map((h, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">

                <td className="p-2 border whitespace-nowrap">
                  {new Date(h.timestamp).toLocaleString()}
                </td>

                <td className="p-2 border">
                  {h.orderIdentifier}
                </td>

                <td className="p-2 border">
                  Step {h.stepIndex + 1} - {h.nodeName}
                </td>

                <td className={`p-2 border font-semibold ${
                  h.action === "COMPLETED"
                    ? "text-green-600"
                    : h.action === "DELAYED"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}>
                  {h.action}
                </td>

                <td className="p-2 border">
                  {h.performedBy || "-"}
                </td>

                <td className="p-2 border">
                  {h.newValue
                    ? JSON.stringify(h.newValue)
                    : "-"}
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  </div>
)}







{showFlowHistory && (
  <div className="fixed top-0 left-0 w-screen h-screen z-[99999] inset-0 bg-black/70 flex items-center justify-center z-50">

    <div className="bg-white w-[95%] max-w-6xl p-6 rounded-xl">

      <h2 className="text-xl font-bold mb-4">
        Flow Analytics View
      </h2>

      {/*flowHistory.map(step => (
        <div key={step.stepIndex} className="mb-6">

          <h3 className="font-bold text-lg mb-2">
            Step {step.stepIndex + 1}: {step.nodeName}
          </h3>

          <div className="border rounded p-3 space-y-2">

            {step.logs.map((log, i) => (
              <div key={i} className="flex justify-between text-sm border-b pb-1">

                <span>{log.orderIdentifier}</span>

                <span className={
                  log.action === "COMPLETED"
                    ? "text-green-600"
                    : log.action === "DELAYED"
                    ? "text-red-600"
                    : "text-yellow-600"
                }>
                  {log.action}
                </span>

                <span>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>

              </div>
            ))}

          </div>
        </div>
      ))*/}


      <div className="overflow-auto max-h-[500px] border rounded">

  <table className="w-full text-sm border">
    <thead className="bg-gray-200 sticky top-0">
      <tr>
        <th>Time</th>
        <th>Order</th>
        <th>Step</th>
        <th>Action</th>
        <th>User</th>
        <th>Delay</th>
      </tr>
    </thead>

    <tbody>
      {flowHistory.map((log, i) => (
        <tr key={i} className="border-b">

          <td>{new Date(log.timestamp).toLocaleString()}</td>

          <td>{log.orderIdentifier}</td>

          <td>
            Step {log.stepIndex + 1} - {log.nodeName}
          </td>

          <td className={
            log.action === "COMPLETED"
              ? "text-green-600"
              : log.action === "DELAYED"
              ? "text-red-600"
              : "text-yellow-600"
          }>
            {log.action}
          </td>

          <td>{log.performedBy || "-"}</td>

          <td>
            {log.newValue?.delay ?? "-"}
          </td>

        </tr>
      ))}
    </tbody>
  </table>

</div>





      <button onClick={()=>setShowFlowHistory(false)}>Close</button>

    </div>
  </div>
)}



  </div>
);
};

export default FmsDashboard;
