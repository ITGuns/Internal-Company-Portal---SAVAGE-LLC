import {
  COUNTRY_CALLING_CODES,
  COUNTRY_CALLING_CODES_BY_LENGTH_DESC,
  DEFAULT_COUNTRY_CALLING_CODE,
} from "@/lib/country-calling-codes";

const COUNTRY_CODE_PATTERN = /^\+\d{1,4}/;
const PHONE_DIGIT_MAX_LENGTH = 15;

export function sanitizeCountryCallingCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits ? `+${digits}` : "+";
}

export function getPhoneCountryCallingCode(value?: string) {
  const trimmed = value?.trim() || "";
  if (!trimmed.startsWith("+")) return DEFAULT_COUNTRY_CALLING_CODE;

  const exactMatch = COUNTRY_CALLING_CODES_BY_LENGTH_DESC.find((option) =>
    trimmed === option.callingCode || trimmed.startsWith(`${option.callingCode} `),
  );
  if (exactMatch) return exactMatch.callingCode;

  const customMatch = COUNTRY_CODE_PATTERN.exec(trimmed);
  return customMatch?.[0] || DEFAULT_COUNTRY_CALLING_CODE;
}

export function getPhoneLocalNumber(value: string, countryCallingCode: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === countryCallingCode) return "";
  if (trimmed.startsWith(countryCallingCode)) {
    return trimmed.slice(countryCallingCode.length).trimStart();
  }
  return trimmed.replace(COUNTRY_CODE_PATTERN, "").trimStart();
}

export function formatPhoneWithCountryCode(countryCallingCode: string, localNumber: string) {
  const normalizedCode = sanitizeCountryCallingCode(countryCallingCode);
  const normalizedLocal = localNumber.replace(/[^\d\s().-]/g, "").replace(/\s{2,}/g, " ").trimStart();
  return normalizedLocal ? `${normalizedCode} ${normalizedLocal}` : normalizedCode;
}

export function normalizePhoneForSave(value: string) {
  const trimmed = value.trim().replace(/\s{2,}/g, " ");
  if (!trimmed) return "";

  const codeOnly = COUNTRY_CALLING_CODES.some((option) => trimmed === option.callingCode);
  if (codeOnly || COUNTRY_CODE_PATTERN.test(trimmed) && trimmed.replace(/\D/g, "").length <= 4) {
    return "";
  }

  return trimmed;
}

export function isValidInternationalPhone(value: string) {
  const normalized = normalizePhoneForSave(value);
  if (!normalized) return true;
  if (!COUNTRY_CODE_PATTERN.test(normalized)) return false;

  const digits = normalized.replace(/\D/g, "");
  const countryCode = getPhoneCountryCallingCode(normalized).replace(/\D/g, "");
  const subscriberDigits = digits.slice(countryCode.length);

  return digits.length <= PHONE_DIGIT_MAX_LENGTH && subscriberDigits.length >= 4;
}
