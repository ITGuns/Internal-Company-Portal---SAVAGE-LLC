/**
 * Disbursement sign-off helpers (2026-10-28): who may press "Approve for
 * disbursement", the signature size check, labels, the lock prompt, and the
 * approval block on the payslip PDF. Rules and messages mirror
 * backend/src/payroll/payslip-approval.service.ts.
 * No runtime imports so node --test can load this file directly.
 */

export const APPROVAL_APPROVED = "approved";
/** The stored PNG data URL, in bytes; the server refuses anything larger. */
export const MAX_SIGNATURE_BYTES = 64 * 1024;
export const SIGNER_NAME_MIN_LENGTH = 2;
export const SIGNER_NAME_MAX_LENGTH = 80;
export const SIGNATURE_MESSAGE = "Draw or type a signature before signing.";
export const SIGNATURE_TOO_LARGE_MESSAGE = "The signature image is larger than 64 KB. Clear it and sign again.";
export const SIGNER_NAME_MESSAGE = `Enter the signer's name, ${SIGNER_NAME_MIN_LENGTH} to ${SIGNER_NAME_MAX_LENGTH} characters.`;
export const CONFIRM_MESSAGE = "Tick the box to confirm you checked the amounts.";
export const SIGNER_ONLY_HINT = "Only a disbursement officer or an admin can approve.";
export const OWN_PAYSLIP_HINT = "Your own payslip needs another signer.";
export const LOCKED_HINT = "The period is locked.";
/** Cursive-looking fonts that ship with Windows, macOS, iOS and Android, for the typed signature. */
export const TYPED_SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", "Apple Chancery", "Snell Roundhand", cursive';

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const PAYROLL_TIME_ZONE = "Asia/Manila";

export interface ApprovalFields {
  approvalStatus?: string | null;
  approvedAt?: string | null;
  approvalSignerName?: string | null;
  approvalSignature?: string | null;
  approvalNote?: string | null;
}

export function isPayslipApproved(payslip: ApprovalFields | null | undefined): boolean {
  return payslip?.approvalStatus === APPROVAL_APPROVED;
}

export function approvalStatusLabel(payslip: ApprovalFields | null | undefined): string {
  return isPayslipApproved(payslip) ? "Approved for disbursement" : "Waiting for disbursement approval";
}

/** The muted line the Payslips Management details show for an unsigned payslip of a locked period. */
export const LOCKED_WITHOUT_SIGN_OFF = "Locked without sign-off";

export type ApprovalDisplayState = "approved" | "pending" | "locked-unsigned";

/**
 * What the screens show about the sign-off (review fix 2026-10-28): approved,
 * pending while the period is open, or locked-unsigned once the period is
 * processed (pass isPayrollPeriodLocked(periodStatus)). Payslips from before
 * the sign-off release start as draft; a locked period never shows them as
 * "Awaiting approval".
 */
export function approvalDisplayState(payslip: ApprovalFields | null | undefined, periodLocked: boolean): ApprovalDisplayState {
  if (isPayslipApproved(payslip)) return "approved";
  return periodLocked ? "locked-unsigned" : "pending";
}

/** "Oct 28, 2026" in the payroll timezone; "" for a missing or bad date. */
export function formatApprovalDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: PAYROLL_TIME_ZONE }).format(date);
}

/** "Approved by Dina Cruz on Oct 28, 2026". */
export function approvedByLine(payslip: ApprovalFields): string {
  const name = payslip.approvalSignerName?.trim() || "a disbursement officer";
  const date = formatApprovalDate(payslip.approvedAt);
  return date ? `Approved by ${name} on ${date}` : `Approved by ${name}`;
}

/** Error for a signature data URL, or null when it can be sent. */
export function checkSignatureDataUrl(dataUrl: string | null | undefined): string | null {
  if (!dataUrl || !dataUrl.startsWith(PNG_DATA_URL_PREFIX) || dataUrl.length <= PNG_DATA_URL_PREFIX.length) return SIGNATURE_MESSAGE;
  if (dataUrl.length > MAX_SIGNATURE_BYTES) return SIGNATURE_TOO_LARGE_MESSAGE;
  return null;
}

export interface SignOffDraft {
  signerName: string;
  signature: string | null;
  confirmed: boolean;
}

export interface SignOffErrors {
  signerName?: string;
  signature?: string;
  confirmed?: string;
}

export function validateSignOff(draft: SignOffDraft): { valid: boolean; errors: SignOffErrors } {
  const errors: SignOffErrors = {};
  const name = draft.signerName.trim().replace(/\s+/g, " ");
  if (name.length < SIGNER_NAME_MIN_LENGTH || name.length > SIGNER_NAME_MAX_LENGTH) errors.signerName = SIGNER_NAME_MESSAGE;
  const signatureError = checkSignatureDataUrl(draft.signature);
  if (signatureError) errors.signature = signatureError;
  if (!draft.confirmed) errors.confirmed = CONFIRM_MESSAGE;
  return { valid: Object.keys(errors).length === 0, errors };
}

/** What the signer saw: the payslip's amounts, or the approve-all count and net total. */
export type ExpectedAmounts =
  | { expectedGrossPay: number; expectedNetPay: number }
  | { expectedCount: number; expectedNet: number };

type ApprovalRequestBody = {
  signerName: string;
  signature: string;
  expectedGrossPay?: number;
  expectedNetPay?: number;
  expectedCount?: number;
  expectedNet?: number;
};

/**
 * Body for POST /payroll/payslips/:id/approve and /payroll/periods/:id/approve-all.
 * The expected amounts make the server refuse (409) when the payslips changed
 * after the dialog opened, so the signature covers what was shown.
 */
export function buildApprovalBody(
  draft: Pick<SignOffDraft, "signerName" | "signature">,
  expected?: ExpectedAmounts,
): ApprovalRequestBody {
  return { signerName: draft.signerName.trim().replace(/\s+/g, " "), signature: draft.signature ?? "", ...(expected ?? {}) };
}

/**
 * "Approve for disbursement" is shown to every payroll role; it is enabled
 * only for signers, on a draft payslip of someone else in an open period.
 */
export function approveButtonState(input: { canSign: boolean; locked: boolean; isOwn: boolean }): { enabled: boolean; hint?: string } {
  if (input.locked) return { enabled: false, hint: LOCKED_HINT };
  if (!input.canSign) return { enabled: false, hint: SIGNER_ONLY_HINT };
  if (input.isOwn) return { enabled: false, hint: OWN_PAYSLIP_HINT };
  return { enabled: true };
}

/** Count at the start of the lock route's 409 message ("2 payslips are not approved ..."), else null. */
export function parseUnapprovedCount(message: string | null | undefined): number | null {
  const match = typeof message === "string" ? message.match(/^(\d+) payslips? (?:is|are) not approved for disbursement/) : null;
  return match ? Number(match[1]) : null;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Confirmation text for Lock & Finalize, with the unapproved count when there is one. */
export function lockConfirmMessage(periodLabel: string, unapproved: number): string {
  const base = `Lock the payroll period ${periodLabel}? Its status becomes processed and its payslips and time can no longer change.`;
  if (unapproved <= 0) return base;
  const waiting = unapproved === 1 ? "1 payslip is" : `${unapproved} payslips are`;
  return `${waiting} not approved for disbursement yet. ${base} Lock it anyway?`;
}

/** "3 of 5 approved" for the period header; "" without payslips. */
export function approvalProgressLabel(summary: { total: number; approved: number } | null | undefined): string {
  if (!summary || summary.total === 0) return "";
  return `${summary.approved} of ${summary.total} approved`;
}

/** What the approve-all result says: approved count, plus what was left and why. */
export function approveAllResultLine(result: { approved: number; alreadyApproved: number; skippedOwn: number; skippedEdited?: number }): string {
  const parts = [`Approved ${plural(result.approved, "payslip")}.`];
  if (result.alreadyApproved > 0) parts.push(`${plural(result.alreadyApproved, "payslip")} already had an approval.`);
  if (result.skippedOwn > 0) parts.push("Your own payslip needs another signer.");
  const edited = result.skippedEdited ?? 0;
  if (edited > 0) parts.push(`${plural(edited, "payslip")} you edited ${edited === 1 ? "needs" : "need"} another signer.`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Payslip PDF
// ---------------------------------------------------------------------------

/** The jsPDF calls the approval block uses. */
export interface PdfDocLike {
  setFillColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setFontSize(size: number): unknown;
  setFont(name: string, style?: string): unknown;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): unknown;
  addImage(data: string, format: string, x: number, y: number, w: number, h: number): unknown;
  splitTextToSize(text: string, maxWidth: number): string[];
}

/**
 * The right-hand signature area of the payslip PDF. `y` is where the
 * employee signature line sits (the summary box ends 20 above it). Approved:
 * a green block from y - 11 to y + 26 with the signature image, its line, the
 * signer and the date. Otherwise the plain "Authorized Signature" line at y.
 */
export function drawPdfApprovalBlock(doc: PdfDocLike, payslip: ApprovalFields, x: number, y: number, width: number): void {
  if (!isPayslipApproved(payslip)) {
    doc.line(x, y, x + width, y);
    doc.text("Authorized Signature", x, y + 5);
    return;
  }
  const top = y - 11;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(x - 2, top, width + 4, 37, 2, 2, "FD");
  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("APPROVED FOR DISBURSEMENT", x + 1, top + 5);
  if (payslip.approvalSignature) {
    try {
      // 3:1 like the sign-off canvas.
      doc.addImage(payslip.approvalSignature, "PNG", x + 1, top + 7, 42, 14);
    } catch {
      doc.text("(signature image could not be read)", x + 1, top + 15);
    }
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(x, top + 23, x + width, top + 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  // A long name wraps under the line instead of running off the page.
  doc.text(doc.splitTextToSize(approvedByLine(payslip), width).slice(0, 2), x, top + 28);
  doc.setFontSize(10);
}
