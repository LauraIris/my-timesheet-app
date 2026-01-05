export type YearMonth = `${number}-${number}`; // e.g. "2025-9"

export type TimesheetState = {
  months: Record<YearMonth, Record<number, number>>; // day -> hours
  prevYearCarry: number; // carry from previous year
};

export type VacationRow = { id: string; label: string; days: number };

export type VacationState = {
  workdayHours: number;
  systemRemainingHours: number;
  rows: VacationRow[];
};

export type AppData = {
  version: 1;
  updatedAt: string;
  ts: TimesheetState;
  vac: VacationState;
};
