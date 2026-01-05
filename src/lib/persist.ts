import { ref, onMounted, watch } from "vue";
import type { AppData, TimesheetState, VacationState } from "./types";

const STORAGE_KEY_TS = "timesheet_state_vue";
const STORAGE_KEY_VAC = "vacation_state_vue";

export const opfsSupported =
  "storage" in navigator &&
  typeof (navigator as any).storage?.getDirectory === "function";
export const opfsStatus = ref<"idle" | "loaded" | "saved" | "error">("idle");

async function readFromOpfs(ts: any, vac: any): Promise<boolean> {
  if (!opfsSupported) return false;
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("app-data.json");
    const file = await handle.getFile();
    const txt = await file.text();
    const data = JSON.parse(txt) as AppData;
    if (data?.ts) ts.value = data.ts;
    if (data?.vac) vac.value = data.vac;
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

function buildData(ts: TimesheetState, vac: VacationState): AppData {
  return { version: 1, updatedAt: new Date().toISOString(), ts, vac } as const;
}

export function usePersistedAppData() {
  const ts = ref<TimesheetState>({ months: {}, prevYearCarry: -4.46 });
  const vac = ref<VacationState>({
    workdayHours: 8.4,
    systemRemainingHours: 87.5,
    rows: [],
  });

  onMounted(async () => {
    // Load LS
    try {
      const rawTs = localStorage.getItem(STORAGE_KEY_TS);
      if (rawTs) ts.value = JSON.parse(rawTs);
      const rawVac = localStorage.getItem(STORAGE_KEY_VAC);
      if (rawVac) vac.value = JSON.parse(rawVac);
    } catch {}
    // Try OPFS
    await readFromOpfs(ts, vac);
  });

  let timer: number | undefined;
  function schedulePersist() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      void persistAll();
    }, 300);
  }

  async function persistAll() {
    const data = buildData(ts.value, vac.value);
    try {
      localStorage.setItem(STORAGE_KEY_TS, JSON.stringify(ts.value));
      localStorage.setItem(STORAGE_KEY_VAC, JSON.stringify(vac.value));
    } catch {}
    await writeToOpfs(data);
  }

  watch(ts, schedulePersist, { deep: true });
  watch(vac, schedulePersist, { deep: true });

  function downloadJson() {
    const data = buildData(ts.value, vac.value);
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
    const data = JSON.parse(txt) as AppData;
    if (data?.ts) ts.value = data.ts;
    if (data?.vac) vac.value = data.vac;
    await persistAll();
  }

  return {
    ts,
    vac,
    opfsSupported,
    opfsStatus,
    schedulePersist,
    persistAll,
    downloadJson,
    importJsonFile,
  };
}
