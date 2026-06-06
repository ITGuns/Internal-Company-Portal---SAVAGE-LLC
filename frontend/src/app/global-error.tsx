"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches errors in the root layout itself.
 * Must render its own <html>/<body> since the layout may have crashed.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <span className="text-4xl">💥</span>
          </div>

          <h1 className="text-3xl font-bold mb-3">Critical Error</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
            The application encountered a critical error and could not render.
            Please try reloading the page.
          </p>

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reload
          </button>

          {error.digest && (
            <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
              Error ID: {error.digest}
            </p>
          )}

          <p className="mt-12 text-xs text-gray-500 dark:text-gray-400 tracking-widest uppercase">
            SAVAGE LLC — Internal Portal
          </p>
        </div>
      </body>
    </html>
  );
}
