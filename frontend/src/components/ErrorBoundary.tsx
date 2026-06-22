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
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-red-400">
              Something went wrong
            </h2>

            <p className="mt-3 text-sm text-[var(--muted)]">
              The application encountered an unexpected error. Your current session data is still stored locally.
            </p>

            {this.state.error && (
              <div className="my-4 max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
                <pre className="whitespace-pre-wrap text-red-300">
                  <code>{this.state.error.toString()}</code>
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-amber-300">
                    <code>{this.state.errorInfo.componentStack}</code>
                  </pre>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
                onClick={this.handleReset}
              >
                Try Again
              </button>
            </div>

            <div className="mt-4 text-xs text-[var(--muted)]">
              If this error persists, contact support with the error details above.
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
