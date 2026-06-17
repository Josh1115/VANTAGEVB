import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[VANTAGE] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">🏐</div>
        <h1
          className="text-2xl font-black tracking-[0.25em] uppercase"
          style={{ color: '#f97316', textShadow: '0 0 8px #f97316, 0 0 20px rgba(249,115,22,0.4)' }}
        >
          VANTAGE
        </h1>
        <div className="space-y-1">
          <p className="font-semibold text-white">Something went wrong</p>
          <p className="text-sm text-slate-400">An unexpected error occurred. Your data is safe.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-lg font-semibold text-sm text-black"
          style={{ background: '#f97316' }}
        >
          Reload App
        </button>
        <details className="text-left max-w-sm w-full">
          <summary className="text-xs text-slate-500 cursor-pointer">Error details</summary>
          <pre className="text-xs text-slate-600 mt-2 overflow-auto whitespace-pre-wrap break-all">
            {this.state.error?.message}
          </pre>
        </details>
      </div>
    );
  }
}
