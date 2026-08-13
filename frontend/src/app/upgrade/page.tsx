"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { useToast } from "@/components/ToastProvider";
import {
  PRICING_PLANS,
  UPGRADE_CONTACT_EMAIL,
  annualMonthlyPrice,
  formatPlanPrice,
  planInquiryMailto,
} from "@/lib/pricing-plans";
import {
  UPGRADE_REQUEST_STATUS_LABELS,
  fetchMyUpgradeRequests,
  requestPlanUpgrade,
  type UpgradeRequest,
} from "@/lib/upgrade-requests";

export default function UpgradePage() {
  const toast = useToast();
  const [openRequest, setOpenRequest] = useState<UpgradeRequest | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // Show the request they already have, so a second visit does not look like
  // nothing happened the first time.
  const loadMine = useCallback(async () => {
    try {
      const mine = await fetchMyUpgradeRequests();
      setOpenRequest(
        mine.find((request) => request.status !== "fulfilled" && request.status !== "declined") || null,
      );
    } catch {
      // Not signed in, or the endpoint is unavailable - the page still sells.
    }
  }, []);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  async function choose(planSlug: string, planName: string) {
    setBusySlug(planSlug);
    try {
      const request = await requestPlanUpgrade(planSlug);
      setOpenRequest(request);
      toast.success(`We have your request for ${planName} - our team will be in touch.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setBusySlug(null);
    }
  }

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
            Start free and move up as your team grows — from one person tracking their own work
            to running payroll for the whole company.
          </p>
        </div>

        {openRequest ? (
          <div className="mx-auto mt-6 max-w-3xl rounded-[var(--radius-md)] border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-4 text-sm">
            <div className="font-semibold text-[var(--foreground)]">
              Your request: {openRequest.planName} — {formatPlanPrice(openRequest.monthlyPrice)}/mo
            </div>
            <p className="mt-1 leading-6 text-[var(--muted)]">
              Status: <strong>{UPGRADE_REQUEST_STATUS_LABELS[openRequest.status]}</strong>.{" "}
              {openRequest.status === "requested"
                ? "Our team will send your invoice shortly. Nothing has been charged yet."
                : openRequest.status === "invoiced"
                  ? "Your invoice is on its way — your plan starts once payment clears."
                  : openRequest.status === "paid"
                    ? "Payment received. We're setting up your account now."
                    : "We're on it."}
            </p>
          </div>
        ) : null}

        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {/* Free and Enterprise have no monthly figure, so "/mo" would
                    read as "Free/mo" and "Custom/mo". */}
                {plan.monthlyPrice ? <span className="text-sm text-[var(--muted)]">/mo</span> : null}
              </div>

              {annualMonthlyPrice(plan) !== null ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  or ${annualMonthlyPrice(plan)}/mo billed yearly
                </p>
              ) : null}

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

              {/* Three different CTAs, because these are three different asks.
                  Free is the plan a free-tier account is already on. Enterprise
                  is negotiated and has no monthly figure, so it cannot be
                  recorded as a priced request - it starts a conversation. The
                  self-serve paid plans file a real request the team can action. */}
              {plan.monthlyPrice === 0 ? (
                <div className="mt-6 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)]">
                  Your current plan
                </div>
              ) : plan.custom ? (
                <a
                  href={planInquiryMailto(plan)}
                  className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Talk to sales
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => choose(plan.slug, plan.name)}
                  disabled={busySlug !== null}
                  className={`mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-[filter,color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-95"
                      : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                >
                  {busySlug === plan.slug
                    ? "Sending..."
                    : openRequest?.planSlug === plan.slug
                      ? "Requested"
                      : openRequest
                        ? "Switch to this plan"
                        : "Choose " + plan.name}
                </button>
              )}
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
