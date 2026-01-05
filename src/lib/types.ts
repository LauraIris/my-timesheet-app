export type YearMonth = `${number}-${number}`; // e.g. "2025-9"

export type YearIndex = number; // e.g. 2025
export type MonthIndex = number; // 0..11
export type DayIndex = number; // 1..31

export type TimesheetMonth = Record<DayIndex, number>; // day -> hours

export type VacationRow = { id: string; label: string; days: number };

export type VacationState = {
  workdayHours: number;
  systemRemainingHours: number;
  rows: VacationRow[];
};

export type YearState = {
  months: Record<MonthIndex, TimesheetMonth>;
  prevYearCarry: number; // carry from previous year
  vac: VacationState;
};

export type TimesheetState = {
  years: Record<YearIndex, YearState>;
};

export type AppData = {
  version: 1;
  updatedAt: string;
  ts: TimesheetState;
};
