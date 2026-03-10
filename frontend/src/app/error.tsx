"use client";

import React, { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import Button from "@/components/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Page Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mb-6">
        <span className="text-4xl">⚠️</span>
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
        Something went wrong
      </h2>
      <p className="text-[var(--muted)] max-w-md mb-8 leading-relaxed">
        An unexpected error occurred while loading this page.
        You can try again, or head back to the dashboard.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          icon={<Home className="w-4 h-4" />}
          onClick={() => (window.location.href = "/dashboard")}
        >
          Dashboard
        </Button>
        <Button
          variant="primary"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={reset}
        >
          Try Again
        </Button>
      </div>

      {/* Error digest for support */}
      {error.digest && (
        <p className="mt-8 text-xs text-[var(--muted)]">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
