import type { VacationRow, YearMonth } from "./types";

export function clampNumber(input: string): number {
  const normalized = input.replace(",", ".");
  const val = Number(normalized);
  return Number.isFinite(val) ? val : 0;
}

export function formatNum(n: number) {
  const fixed = n.toFixed(2);
  const tidy = fixed.replace(/\.00$/, ".0").replace(/(\.\d)0$/, "$1");
  return tidy.replace(".", ",");
}

export function ymKey(year: number, monthIndex0: number): YearMonth {
  return `${year}-${monthIndex0 + 1}` as YearMonth; // store months 1..12
}

export function parseYmKey(key: YearMonth): {
  year: number;
  monthIndex0: number;
} {
  const [y, m] = key.split("-").map(Number);
  return { year: y, monthIndex0: m - 1 };
}

export function getDaysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function monthLabel(
  year: number,
  monthIndex0: number,
  locale = "de-CH"
) {
  return new Date(year, monthIndex0, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function monthName(monthIndex0: number, locale = "de-CH") {
  return new Date(2000, monthIndex0, 1).toLocaleDateString(locale, {
    month: "long",
  });
}

export function weekdayShort(year: number, monthIndex0: number, d: number) {
  return new Date(year, monthIndex0, d).toLocaleDateString("de-CH", {
    weekday: "short",
  });
}

export function isWeekend(year: number, monthIndex0: number, d: number) {
  const dow = new Date(year, monthIndex0, d).getDay();
  return dow === 0 || dow === 6;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// --- ISO date-string ("YYYY-MM-DD") helpers ---
// Arithmetic is anchored to UTC midnight so it can't drift across DST
// changes or the caller's local timezone offset — only the calendar date
// (never a real instant) is ever in play here.

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function addDays(dateStr: string, amount: number): string {
  const date = parseDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateOnly(date);
}

export function isWeekendDate(dateStr: string): boolean {
  const day = parseDateOnly(dateStr).getUTCDay();
  return day === 0 || day === 6;
}

// Today's date where the user actually is — this is the one place local
// time is intentionally used, since "today" means the caller's calendar day.
export function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getNextWorkday(dateStr: string): string {
  let next = addDays(dateStr, 1);
  while (isWeekendDate(next)) {
    next = addDays(next, 1);
  }
  return next;
}

// Inclusive on both ends: a vacation from Monday to Friday counts 5 days.
export function countWorkdays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || startDate > endDate) {
    return 0;
  }

  let current = startDate;
  let workdays = 0;
  while (current <= endDate) {
    if (!isWeekendDate(current)) {
      workdays += 1;
    }
    current = addDays(current, 1);
  }
  return workdays;
}

// The earliest sensible start for a newly added vacation row: the day after
// the latest existing row's end date, or today if that's later (or there
// are no rows yet).
export function getLastVacationEndDate(
  sortedRows: VacationRow[],
  todayStr: string
): string {
  const lastRow = sortedRows[sortedRows.length - 1];
  if (!lastRow) {
    return todayStr;
  }
  return lastRow.endDate > todayStr ? lastRow.endDate : todayStr;
}
