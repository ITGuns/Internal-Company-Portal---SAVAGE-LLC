/**
 * Typed payroll errors. Controllers map them to HTTP statuses:
 * Forbidden 403, NotFound 404, Validation 400, Conflict 409.
 * Messages are written for end users and never include internals.
 */
export class PayrollForbiddenError extends Error { }
export class PayrollNotFoundError extends Error { }
export class PayrollValidationError extends Error { }
export class PayrollConflictError extends Error { }
