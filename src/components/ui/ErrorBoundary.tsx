import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI render failed', error.message, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="loading" role="alert">
          <h1>We couldn’t display this view</h1>
          <p>Your saved work is still on the server. Reload to reconnect.</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Reload workspace
          </button>
        </div>
      );
    return this.props.children;
  }
}
