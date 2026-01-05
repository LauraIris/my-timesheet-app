import { ref, onMounted, watch } from "vue";
import type { AppData, TimesheetState, YearState } from "./types";

const STORAGE_KEY_TS = "timesheet_state_vue";

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
    ts.value = data.ts;
    // try to migrate older packages that had top-level vac + months
    // If we detected an older bundle that stored ts + vac separately
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
  const ts = ref<TimesheetState>({ years: {} as Record<number, YearState> });

  onMounted(async () => {
    // Load LS
    try {
      const rawTs = localStorage.getItem(STORAGE_KEY_TS);
      if (rawTs) {
        const parsed = JSON.parse(rawTs);
        ts.value = parsed as TimesheetState;
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
    const data = JSON.parse(txt) as AppData;
    ts.value = data.ts;
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
