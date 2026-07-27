"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Paperclip, Phone, Wrench, X } from "lucide-react";
import {
  fileToDataUri,
  submitGemfieldTicket,
  type GemfieldTicketKind,
  type GemfieldWizardSubmission,
} from "@/lib/gemfield";
import {
  GEMFIELD_WIZARD_CATEGORIES,
  GEMFIELD_WIZARD_VERSION,
  getWizardCategory,
  type WizardOption,
} from "@/lib/gemfield-ticket-wizard";

interface TicketWizardProps {
  organizationId: string;
  onClose: () => void;
  onSubmitted?: (reference: string) => void;
  supportPhone?: string | null;
  callbackHours?: string | null;
  projectPages?: WizardOption[]; // optional real pages from the client's project
}

const TOTAL_STEPS = 4;

const pillClass =
  "min-h-10 rounded-[var(--radius-md)] border px-3 text-sm font-medium transition-colors";

export default function TicketWizard({
  organizationId,
  onClose,
  onSubmitted,
  supportPhone,
  callbackHours,
  projectPages,
}: TicketWizardProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [callbackNumber, setCallbackNumber] = useState("");
  const [callbackWindow, setCallbackWindow] = useState("");
  const [showCallback, setShowCallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const activeCategory = useMemo(() => getWizardCategory(category), [category]);

  const narrowFields = activeCategory?.narrow ?? [];
  const canProceedStep1 = Boolean(category);
  const canProceedStep2 = narrowFields.every((field) => Boolean(answers[field.id]));

  function optionsFor(field: { fromProjectPages?: boolean; options: WizardOption[] }): WizardOption[] {
    if (field.fromProjectPages && projectPages && projectPages.length) {
      const seen = new Set(projectPages.map((page) => page.value));
      return [...projectPages, ...field.options.filter((option) => !seen.has(option.value))];
    }
    return field.options;
  }

  async function buildSubmission(kind: GemfieldTicketKind): Promise<GemfieldWizardSubmission> {
    const attachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        contentType: file.type || undefined,
        data: await fileToDataUri(file),
      })),
    );
    return {
      category: category || "other",
      description: description.trim() || null,
      wizardVersion: GEMFIELD_WIZARD_VERSION,
      wizardAnswers: Object.keys(answers).length ? answers : null,
      ticketKind: kind,
      callbackNumber: kind === "callback" ? callbackNumber.trim() || null : null,
      callbackWindow: kind === "callback" ? callbackWindow.trim() || null : null,
      attachments,
    };
  }

  async function submit(kind: GemfieldTicketKind) {
    setSubmitting(true);
    setError(null);
    try {
      const submission = await buildSubmission(kind);
      const result = await submitGemfieldTicket(organizationId, submission);
      setReference(result.reference);
      onSubmitted?.(result.reference);
    } catch {
      setError("We couldn't send that just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New request"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-[var(--card-bg)] shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">New request</p>
            <h2 className="text-base font-semibold">How can we help?</h2>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-md p-1.5 hover:bg-[var(--card-surface)]">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {/* progress dots */}
        {!reference ? (
          <div className="flex items-center gap-1.5 px-5 pt-4" aria-hidden>
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
              />
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {reference ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <Check className="h-6 w-6 text-[var(--accent)]" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">Request sent</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Your reference is <strong>{reference}</strong>. We&apos;ll follow up in Deskii.
              </p>
              <button onClick={onClose} className={`${pillClass} mt-5 border-[var(--accent)] text-[var(--accent)]`}>
                Done
              </button>
            </div>
          ) : (
            <>
              {step === 1 ? (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">What&apos;s this about?</legend>
                  {GEMFIELD_WIZARD_CATEGORIES.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCategory(option.value)}
                      className={`flex w-full flex-col rounded-[var(--radius-md)] border p-3 text-left ${
                        category === option.value
                          ? "border-[var(--accent)] bg-[var(--accent)]/5"
                          : "border-[var(--border)] hover:bg-[var(--card-surface)]"
                      }`}
                    >
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 text-sm text-[var(--muted)]">{option.description}</span>
                    </button>
                  ))}
                </fieldset>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  {narrowFields.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No extra details needed — let&apos;s keep going.</p>
                  ) : (
                    narrowFields.map((field) => (
                      <fieldset key={field.id}>
                        <legend className="mb-2 text-sm font-medium">{field.label}</legend>
                        <div className="flex flex-wrap gap-2">
                          {optionsFor(field).map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setAnswers((prev) => ({ ...prev, [field.id]: option.value }))}
                              className={`${pillClass} ${
                                answers[field.id] === option.value
                                  ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                                  : "border-[var(--border)] hover:bg-[var(--card-surface)]"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ))
                  )}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="wizard-description">
                      Tell us what you&apos;d like
                    </label>
                    <textarea
                      id="wizard-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Links and examples help us get it right the first time."
                      className="min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--card-surface)]">
                      <Paperclip className="h-4 w-4" aria-hidden /> Add photos or files
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/gif,application/pdf"
                        className="hidden"
                        onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
                      />
                    </label>
                    {files.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                        {files.map((file) => (
                          <li key={file.name} className="truncate">• {file.name}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-3 text-sm">
                  <h3 className="text-sm font-semibold">Review &amp; send</h3>
                  <dl className="space-y-2">
                    <Row label="About" value={activeCategory?.label ?? "—"} />
                    {narrowFields.map((field) => (
                      <Row
                        key={field.id}
                        label={field.label}
                        value={optionsFor(field).find((option) => option.value === answers[field.id])?.label ?? "—"}
                      />
                    ))}
                    <Row label="Details" value={description.trim() || "—"} />
                    <Row label="Attachments" value={files.length ? `${files.length} file(s)` : "None"} />
                  </dl>
                  <p className="text-[var(--muted)]">We usually reply within one business day.</p>
                </div>
              ) : null}

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </>
          )}
        </div>

        {!reference ? (
          <footer className="space-y-3 border-t border-[var(--border)] px-5 py-4">
            {/* Callback request (files a priority ticket with the client's number + preferred time) */}
            {showCallback ? (
              <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <p className="text-sm font-medium">Request a callback</p>
                {callbackHours ? <p className="text-xs text-[var(--muted)]">We call back {callbackHours}.</p> : null}
                <input
                  value={callbackNumber}
                  onChange={(event) => setCallbackNumber(event.target.value)}
                  placeholder="Your phone number"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm"
                />
                <input
                  value={callbackWindow}
                  onChange={(event) => setCallbackWindow(event.target.value)}
                  placeholder="Best time to reach you (optional)"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCallback(false)} className={`${pillClass} border-[var(--border)]`}>
                    Cancel
                  </button>
                  <button
                    disabled={submitting || !callbackNumber.trim()}
                    onClick={() => submit("callback")}
                    className={`${pillClass} border-[var(--accent)] bg-[var(--accent)] text-white disabled:opacity-60`}
                  >
                    Request callback
                  </button>
                </div>
              </div>
            ) : null}

            {/* Always-visible one-tap affordances */}
            <div className="flex flex-wrap gap-2">
              {supportPhone ? (
                <a href={`tel:${supportPhone}`} className={`${pillClass} border-[var(--border)] inline-flex items-center gap-1.5`}>
                  <Phone className="h-4 w-4" aria-hidden /> Call support
                </a>
              ) : null}
              <button
                onClick={() => setShowCallback((value) => !value)}
                className={`${pillClass} inline-flex items-center gap-1.5 border-[var(--border)]`}
              >
                <Phone className="h-4 w-4" aria-hidden /> Request a callback
              </button>
              <button
                disabled={submitting}
                onClick={() => submit("dev_assist")}
                className={`${pillClass} inline-flex items-center gap-1.5 border-[var(--border)] disabled:opacity-60`}
              >
                <Wrench className="h-4 w-4" aria-hidden /> Request a developer
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => (step === 1 ? onClose() : setStep((value) => value - 1))}
                className={`${pillClass} inline-flex items-center gap-1.5 border-[var(--border)]`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> {step === 1 ? "Cancel" : "Back"}
              </button>
              {step < TOTAL_STEPS ? (
                <button
                  disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                  onClick={() => setStep((value) => value + 1)}
                  className={`${pillClass} inline-flex items-center gap-1.5 border-[var(--accent)] bg-[var(--accent)] text-white disabled:opacity-50`}
                >
                  Next <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  disabled={submitting}
                  onClick={() => submit("standard")}
                  className={`${pillClass} inline-flex items-center gap-1.5 border-[var(--accent)] bg-[var(--accent)] text-white disabled:opacity-60`}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Send request
                </button>
              )}
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{value}</dd>
    </div>
  );
}
