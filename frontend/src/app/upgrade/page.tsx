"use client";

import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import {
  PRICING_PLANS,
  UPGRADE_CONTACT_EMAIL,
  formatPlanPrice,
  planInquiryMailto,
} from "@/lib/pricing-plans";

export default function UpgradePage() {
  return (
    <main className="main-content-height bg-transparent text-[var(--foreground)]">
      <Header />
      <div className="mx-auto max-w-[1480px] p-4 pt-3 md:p-6">
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
        </Link>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Upgrade your account
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-pretty md:text-3xl">
            Choose the plan that grows your business
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Every plan includes a professionally built website. Move up as you grow — from a simple
            online presence to a fully managed growth system.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.slug}
              padding="lg"
              className={`relative flex flex-col ${plan.highlight ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-foreground)]">
                  Most Popular
                </div>
              )}

              <h2 className="text-sm font-semibold text-[var(--foreground)]">{plan.name}</h2>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">
                  {formatPlanPrice(plan.monthlyPrice)}
                </span>
                <span className="text-sm text-[var(--muted)]">/mo</span>
              </div>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{plan.tagline}</p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-completed)]"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex-1" />

              <a
                href={planInquiryMailto(plan)}
                className={`mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-[filter,color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  plan.highlight
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-95"
                    : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                Get started
              </a>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Not sure which plan fits?{" "}
          <a href={`mailto:${UPGRADE_CONTACT_EMAIL}`} className="text-[var(--accent)] hover:underline">
            Talk to us
          </a>{" "}
          and we&apos;ll help you choose.
        </p>
      </div>
    </main>
  );
}
