import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen center-v pad-x">
        <h1>Something went wrong · Něco se pokazilo</h1>
        <p className="muted">Your game is saved on this device. · Hra je uložená v tomto zařízení.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            location.hash = '#/';
            location.reload();
          }}
        >
          Reload · Načíst znovu
        </button>
      </div>
    );
  }
}
