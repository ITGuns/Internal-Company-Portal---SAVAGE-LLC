export function formatEstimatedMinutesAsClock(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "";

  const wholeMinutes = Math.floor(minutes);
  const hours = Math.floor(wholeMinutes / 60);
  const remainingMinutes = wholeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

export function parseEstimatedClockToMinutes(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes > 0 ? totalMinutes : null;
}

export function getLocalTodayDateInput(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}
