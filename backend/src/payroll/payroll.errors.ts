/**
 * Typed payroll errors. Controllers map them to HTTP statuses:
 * Forbidden 403, NotFound 404, Validation 400, Conflict 409.
 * Messages are written for end users and never include internals.
 */
export class PayrollForbiddenError extends Error { }
export class PayrollNotFoundError extends Error { }
export class PayrollValidationError extends Error { }
export class PayrollConflictError extends Error { }

/**
 * Lock & Finalize refused while payslips of the period wait for disbursement
 * sign-off (2026-10-28). The lock route answers 409 with `unapprovedCount`;
 * the message starts with the count, which the frontend reads.
 */
export class UnapprovedPayslipsError extends PayrollConflictError {
    constructor(readonly count: number) {
        super(`${count} ${count === 1 ? 'payslip is' : 'payslips are'} not approved for disbursement yet.`)
    }

    /**
     * The 409 message for a caller who cannot lock anyway (review fix
     * 2026-10-28): only a Disbursement Officer or full access may force the lock.
     */
    signerOnlyMessage(): string {
        return `${this.count} ${this.count === 1 ? 'payslip is' : 'payslips are'} not approved. A Disbursement Officer or an admin can lock anyway.`
    }
}
