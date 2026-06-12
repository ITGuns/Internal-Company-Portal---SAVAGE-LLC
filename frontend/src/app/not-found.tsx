"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Home, AlertTriangle } from "lucide-react";
import Button from "@/components/Button";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>

            {/* Code */}
            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[var(--foreground)] to-[var(--muted)] mb-2 leading-none">
                404
            </h1>

            {/* Headline */}
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
                Page Not Found
            </h2>
            <p className="text-[var(--muted)] max-w-sm mb-8 leading-relaxed">
                The page you're looking for doesn&apos;t exist or has been moved.
                Let&apos;s get you back to the portal.
            </p>

            {/* Action */}
            <Button
                variant="primary"
                icon={<Home className="w-4 h-4" />}
                onClick={() => router.push("/dashboard")}
            >
                Back to Dashboard
            </Button>

            {/* Branding */}
            <p className="mt-12 text-xs text-[var(--muted)] tracking-widest uppercase">
                SAVAGE LLC — Internal Portal
            </p>
        </div>
    );
}
