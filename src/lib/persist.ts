import { ref, onMounted, watch } from "vue";
import type { AppData, TimesheetState, VacationState } from "./types";

const STORAGE_KEY_TS = "timesheet_state_vue";
const STORAGE_KEY_VAC = "vacation_state_vue"; // kept for compatibility

export const opfsSupported =
  "storage" in navigator &&
  typeof (navigator as any).storage?.getDirectory === "function";
export const opfsStatus = ref<"idle" | "loaded" | "saved" | "error">("idle");

async function readFromOpfs(ts: any): Promise<boolean> {
  if (!opfsSupported) return false;
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("app-data.json");
    const file = await handle.getFile();
    const txt = await file.text();
    const data = JSON.parse(txt) as AppData;
    if (data?.ts) ts.value = data.ts;
    // support legacy top-level vac by mapping into current year
    if ((data as any)?.vac) {
      const vacLegacy = (data as any).vac as VacationState;
      const cy = new Date().getFullYear();
      ts.value.years = ts.value.years || {};
      ts.value.years[cy] = ts.value.years[cy] || {
        months: {},
        prevYearCarry: 0,
        vac: vacLegacy,
      };
    }
    opfsStatus.value = "loaded";
    return true;
  } catch {
    return false;
  }
}

async function writeToOpfs(data: AppData): Promise<boolean> {
  if (!opfsSupported) return false;
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("app-data.json", { create: true });
    console.log("handle", handle);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
    opfsStatus.value = "saved";
    return true;
  } catch (e) {
    console.error("OPFS write error", e);
    opfsStatus.value = "error";
    return false;
  }
}

function buildData(ts: TimesheetState): AppData {
  return { version: 1, updatedAt: new Date().toISOString(), ts } as const;
}

export function usePersistedAppData() {
  const ts = ref<TimesheetState>({ years: {} });

  onMounted(async () => {
    // Load LS
    try {
      const rawTs = localStorage.getItem(STORAGE_KEY_TS);
      if (rawTs) ts.value = JSON.parse(rawTs);
      // Support legacy separate vacation storage by mapping into current year
      const rawVac = localStorage.getItem(STORAGE_KEY_VAC);
      if (rawVac) {
        const vacLegacy = JSON.parse(rawVac) as VacationState;
        const cy = new Date().getFullYear();
        ts.value.years = ts.value.years || {};
        ts.value.years[cy] = ts.value.years[cy] || {
          months: {},
          prevYearCarry: 0,
          vac: vacLegacy,
        };
      }
    } catch {}
    // Try OPFS
    await readFromOpfs(ts);
  });

  let timer: number | undefined;
  function schedulePersist() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      void persistAll();
    }, 300);
  }

  async function persistAll() {
    const data = buildData(ts.value);
    try {
      localStorage.setItem(STORAGE_KEY_TS, JSON.stringify(ts.value));
    } catch {}
    await writeToOpfs(data);
  }

  watch(ts, schedulePersist, { deep: true });

  function downloadJson() {
    const data = buildData(ts.value);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJsonFile(file: File) {
    const txt = await file.text();
    const data = JSON.parse(txt) as any;

    // Handle legacy shape where ts had months and prevYearCarry at top-level
    if (data?.ts && data.ts.months) {
      const cy = new Date().getFullYear();
      ts.value = { years: {} };
      ts.value.years[cy] = {
        months: {},
        prevYearCarry: data.ts.prevYearCarry || 0,
        vac: data.vac || { workdayHours: 8.4, systemRemainingHours: 0, rows: [] },
      };
      // convert months keys from YearMonth string to numeric monthIndex0
      for (const k in data.ts.months) {
        const [yStr, mStr] = k.split("-");
        const year = Number(yStr);
        const m0 = Number(mStr) - 1; // convert stored 1..12 to 0..11
        const targetYear = year || cy;
        ts.value.years[targetYear] = ts.value.years[targetYear] || {
          months: {},
          prevYearCarry: 0,
          vac: data.vac || { workdayHours: 8.4, systemRemainingHours: 0, rows: [] },
        };
        ts.value.years[targetYear].months[m0] = data.ts.months[k];
      }
    } else if (data?.ts) {
      // New shape
      ts.value = data.ts;
    }

    await persistAll();
  }

  return {
    ts,
    opfsSupported,
    opfsStatus,
    schedulePersist,
    persistAll,
    downloadJson,
    importJsonFile,
  };
}
