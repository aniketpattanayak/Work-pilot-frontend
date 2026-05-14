import { ShieldOff, Clock, Mail, LogOut } from 'lucide-react';

export default function SubscriptionPaused({ reason, pausedAt, companyName }) {
  const pausedDate = pausedAt
    ? new Date(pausedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full">

        {/* Top accent */}
        <div className="h-1 w-24 bg-amber-500 rounded-full mx-auto mb-8" />

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center">
            <ShieldOff size={44} className="text-amber-500" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-3">
            Subscription Paused
          </h1>
          {companyName && (
            <p className="text-sm font-semibold text-muted-foreground mb-2">{companyName}</p>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Access to your WorkPilot workspace has been temporarily suspended.
            All your data is safe and will be restored when access is resumed.
          </p>
        </div>

        {/* Details card */}
        {(reason || pausedDate) && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-4">
            {reason && (
              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm text-foreground font-medium">{reason}</p>
                </div>
              </div>
            )}
            {pausedDate && (
              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Paused on</p>
                  <p className="text-sm text-foreground font-medium">{pausedDate}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact note */}
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground">
            To restore access, please contact your WorkPilot administrator.
          </p>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <LogOut size={15} /> Sign out
        </button>

      </div>
    </div>
  );
}