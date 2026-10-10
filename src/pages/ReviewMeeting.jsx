import React from 'react';
import { Lock } from 'lucide-react';
import { isViewerOnly } from '../utils/viewerMode';
import GlobalView from './GlobalView';

/**
 * REVIEW MEETING — the same dense sheet as Global View, with the Admin controls
 * (Late Target, delete) switched on. Only Admins reach it; a Viewer-only login gets the read-only version.
 */
const ReviewMeeting = ({ tenantId }) => {
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user')) || {}; } catch { user = {}; }
  const viewer = isViewerOnly();
  const isAdmin = user.roles?.includes('Admin') || user.role === 'Admin';

  if (!isAdmin && !viewer) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center gap-4">
        <div className="bg-red-50 p-5 rounded-full border-4 border-red-100"><Lock className="text-red-500" size={44} strokeWidth={1.5} /></div>
        <h3 className="text-foreground text-xl font-black uppercase tracking-tight">Access Restricted</h3>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] italic">The Review Meeting is reserved for Admins.</p>
      </div>
    );
  }
  return <GlobalView tenantId={tenantId} mode={viewer ? 'view' : 'review'} />;
};

export default ReviewMeeting;
