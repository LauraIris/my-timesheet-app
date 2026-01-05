import { ref, onMounted, watch } from "vue";
import type { AppData, TimesheetState } from "./types";
import { parseYmKey } from "./utils";

const STORAGE_KEY_TS = "timesheet_state_vue";

export const opfsSupported =
  "storage" in navigator &&
  typeof (navigator as any).storage?.getDirectory === "function";
export const opfsStatus = ref<"idle" | "loaded" | "saved" | "error">("idle");

function migrateOldToNew(old: any): TimesheetState {
  // old shape: { months: Record<YearMonth, Record<number, number>>, prevYearCarry: number }
  const years: Record<number, any> = {};
  if (old?.months && typeof old.months === "object") {
    for (const k in old.months) {
      try {
        const { year, monthIndex0 } = parseYmKey(k as any);
        years[year] ||= { months: {}, prevYearCarry: 0, vac: null };
        years[year].months[monthIndex0] = old.months[k];
        // copy old prevYearCarry into each year (best-effort)
        years[year].prevYearCarry = old.prevYearCarry ?? 0;
      } catch {
        // ignore parse errors
      }
    }
  }
  // If nothing found, return empty
  return { years };
}

async function readFromOpfs(ts: any): Promise<boolean> {
  if (!opfsSupported) return false;
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("app-data.json");
    const file = await handle.getFile();
    const txt = await file.text();
    const data: any = JSON.parse(txt); // const data = JSON.parse(txt) as AppData;
    if (data?.ts) ts.value = data.ts;
    // try to migrate older packages that had top-level vac + months
    if (!data?.ts && (data?.months || data?.vac)) {
      ts.value = migrateOldToNew(data);
    }
    // If we detected an older bundle that stored ts + vac separately
    if (data?.ts?.months && data?.vac) {
      const migrated = migrateOldToNew(data.ts);
      // attach vac to all years
      for (const y in migrated.years) {
        migrated.years[y].vac = data.vac;
      }
      ts.value = migrated;
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
  return { version: 2, updatedAt: new Date().toISOString(), ts } as const;
}

export function usePersistedAppData() {
  const ts = ref<TimesheetState>({ years: {} });

  onMounted(async () => {
    // Load LS
    try {
      const rawTs = localStorage.getItem(STORAGE_KEY_TS);
      if (rawTs) {
        const parsed = JSON.parse(rawTs);
        // support both old and new formats
        if (parsed?.years) ts.value = parsed;
        else ts.value = migrateOldToNew(parsed);
      }
    } catch {}
    // Try OPFS
    await readFromOpfs(ts);
  });

  let timer: number | undefined;
  function schedulePersist() {
    globalThis.clearTimeout(timer);
    timer = globalThis.setTimeout(() => {
      void persistAll();
    }, 300);
  }

  async function persistAll() {
    const data = buildData(ts.value);
    try {
      localStorage.setItem(STORAGE_KEY_TS, JSON.stringify(ts.value));
    } catch {}
    await writeToOpfs(data as any);
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
    if (data?.ts) {
      // new format
      ts.value = data.ts;
      // if imported older format with ts.months + vac
    } else if (data?.months || data?.vac) {
      ts.value = migrateOldToNew(data);
      if (data?.vac) {
        // attach vac to all years
        for (const y in ts.value.years) ts.value.years[y].vac = data.vac;
      }
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
