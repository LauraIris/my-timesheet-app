export type Month = Record<number, number>; // day -> hours

export type VacationRow = { id: string; label: string; days: number };

export type Year = Record<number, YearState>;

export type VacationState = {
  systemRemainingHours: number;
  rows: VacationRow[];
};

export type YearState = {
  months: Record<number, Month>;
  prevYearCarry: number;
  workdayHours: number;
  vac: VacationState;
};

export const DEFAULT_WORKDAY_HOURS = 8.4;
export const DEFAULT_VACATION_REMAINING_HOURS = 87.5;

export function defaultVacationState(): VacationState {
  return {
    systemRemainingHours: DEFAULT_VACATION_REMAINING_HOURS,
    rows: [],
  };
}

export function defaultYearState(
  prevYearCarry: number,
  vacationState?: VacationState
): YearState {
  return {
    months: {},
    prevYearCarry,
    workdayHours: DEFAULT_WORKDAY_HOURS,
    vac: vacationState || defaultVacationState(),
  };
}

export type TimesheetState = {
  years: Year;
};

export type AppData = {
  version: 2;
  updatedAt: string;
  ts: TimesheetState;
};
