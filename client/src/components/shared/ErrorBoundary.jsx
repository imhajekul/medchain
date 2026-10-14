'use client';

import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MedVault ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="page-wrapper" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="container" style={{ maxWidth: '540px' }}>
            <div className="glass-card" style={{ padding: '36px 28px', textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(15, 23, 42, 0.85)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>
                {this.props.title || 'Unable to display record'}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                {this.state.error?.message || 'An unexpected error occurred while rendering the medical record details.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <ArrowLeft size={16} /> Return to Dashboard
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={this.handleReset}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
