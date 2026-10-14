import React from 'react';

/**
 * Catches a crash inside one page so the rest of the app (header, sidebar) stays up and the person sees
 * what happened instead of a blank screen. `resetKey` (the current URL) clears the error when they navigate.
 */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Page crashed:', error, info && info.componentStack); }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="w-full max-w-xl mx-auto mt-16 bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-red-500">This page hit a problem</p>
        <p className="text-xs text-slate-500 mt-2 break-words">{String((this.state.error && this.state.error.message) || this.state.error)}</p>
        <div className="flex justify-center gap-2 mt-4">
          <button type="button" onClick={() => this.setState({ error: null })} className="min-h-[44px] px-4 py-2 rounded-xl border border-border text-[11px] font-black uppercase tracking-wider hover:bg-muted">Try again</button>
          <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider">Reload</button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
