import type { YearMonth } from "./types";

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
