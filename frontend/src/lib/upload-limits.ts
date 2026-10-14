/**
 * Upload limits, shown before a file is picked and checked before sending.
 * Vercel refuses request bodies above 4.5 MB and files travel as base64 JSON
 * (a third larger), so 3 MB is the largest file that reliably arrives.
 * Gemfield tickets go through a 1 MB JSON parser: about 700 KB of files in
 * total. Mirrors backend/src/uploads/upload.validation.ts and
 * backend/src/clients/gemfield/gemfield-ticket.service.ts.
 * No runtime imports so node --test can load this file directly.
 */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "3 MB";
export const MAX_TICKET_ATTACHMENTS = 6;
export const MAX_TICKET_ATTACHMENTS_BYTES = 700 * 1024;
export const MAX_TICKET_ATTACHMENTS_LABEL = "700 KB";

interface SizedFile {
  name: string;
  size: number;
}

/** A plain message when the file is over the upload limit, otherwise null. */
export function fileTooLargeMessage(file: SizedFile): string | null {
  return file.size > MAX_UPLOAD_BYTES
    ? `${file.name} is larger than ${MAX_UPLOAD_LABEL}. Choose a smaller file.`
    : null;
}

/** A plain message when ticket attachments together pass the limit, otherwise null. */
export function ticketAttachmentsTooLargeMessage(files: readonly SizedFile[]): string | null {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  return total > MAX_TICKET_ATTACHMENTS_BYTES
    ? `Attachments can be up to ${MAX_TICKET_ATTACHMENTS_LABEL} in total. Remove a file or choose smaller ones.`
    : null;
}
