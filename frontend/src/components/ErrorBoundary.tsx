"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to error reporting service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-error text-2xl">
                ⚠️ Something went wrong
              </h2>
              
              <p className="text-base-content/70">
                The application encountered an unexpected error. Don&apos;t worry, your data is safe.
              </p>

              {this.state.error && (
                <div className="mockup-code bg-base-300 text-sm overflow-auto max-h-60 my-4">
                  <pre data-prefix="$" className="text-error">
                    <code>{this.state.error.toString()}</code>
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <pre data-prefix=">" className="text-warning text-xs">
                      <code>{this.state.errorInfo.componentStack}</code>
                    </pre>
                  )}
                </div>
              )}

              <div className="card-actions justify-end gap-2 mt-4">
                <button
                  className="btn btn-outline"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
                <button
                  className="btn btn-primary"
                  onClick={this.handleReset}
                >
                  Try Again
                </button>
              </div>

              <div className="text-xs text-base-content/50 mt-4">
                If this error persists, please contact support with the error details above.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience hook-style wrapper (still uses class component internally)
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
