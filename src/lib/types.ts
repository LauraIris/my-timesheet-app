export type YearMonth = `${number}-${number}`; // e.g. "2025-9"

export type Month = Record<number, number>; // day -> hours

export type VacationRow = { id: string; label: string; days: number };

export type VacationState = {
  workdayHours: number;
  systemRemainingHours: number;
  rows: VacationRow[];
};

export type YearState = {
  months: Record<number, Month>;
  prevYearCarry: number;
  vac: VacationState;
};

export type TimesheetState = {
  years: Record<number, YearState>;
};

export type AppData = {
  version: 2;
  updatedAt: string;
  ts: TimesheetState;
};
