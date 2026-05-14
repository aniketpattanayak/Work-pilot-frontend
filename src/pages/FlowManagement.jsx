import { useState } from 'react';
import FlowBuilder from './FlowBuilder';
import FlowMonitor from './FlowMonitor';
import { Activity, Plus, ArrowLeft } from 'lucide-react';

export default function FlowManagement({ tenantId, user }) {
  const [view, setView] = useState('monitor');

  if (view === 'builder') {
    return <FlowBuilder tenantId={tenantId} onFlowSaved={() => setView('monitor')} />;
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <FlowMonitor tenantId={tenantId} onCreateFlow={() => setView('builder')} />
    </div>
  );
}