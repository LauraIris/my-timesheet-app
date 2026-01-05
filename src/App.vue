<template>
  <div class="min-h-screen bg-neutral-50 text-neutral-900 p-6">
    <div class="max-w-none mx-auto">
      <header
        class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl md:text-3xl font-semibold">
            Overtime & Vacation – Tracker
          </h1>
          <p class="text-sm text-neutral-600">
            Local auto save + JSON-File (Export/Import/OPFS)
          </p>
        </div>
        <TotalsCard
          :prev-year-carry="prevCarry"
          :current-year-total="currentYearTotal"
          :grand-total="grandTotal"
        />
      </header>

      <!-- Data toolbar -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <button
          @click="downloadJson"
          class="px-3 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-sm"
        >
          Download JSON
        </button>
        <label
          class="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm cursor-pointer"
        >
          Import JSON
          <input
            ref="fileInput"
            type="file"
            accept="application/json"
            class="hidden"
            @change="onImportFile"
          />
        </label>
        <button
          v-if="opfsSupported"
          @click="persistAll"
          class="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm"
        >
          Save OPFS
        </button>
        <span class="ml-auto text-xs text-neutral-500">
          <template v-if="opfsSupported"
            >OPFS: <strong>{{ opfsStatus }}</strong></template
          >
          <template v-else
            >OPFS not supported – use LocalStorage + Download</template
          >
        </span>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        <section class="md:col-span-2">
          <TimesheetPanel
            v-model:ts="ts"
            v-model:selectedYear="selectedYear"
            v-model:selectedMonth="selectedMonth"
            :prev-year-carry="prevCarry"
          />
        </section>
        <aside class="md:col-span-1">
          <VacationPanel
            v-model:vac="vac"
            v-model:workday-hours="workdayHours"
            :computed="vacationComputed"
          />
        </aside>
      </div>

      <footer class="mt-10 text-xs text-neutral-500">
        <p>
          Data is stored in LocalStorage and—when possible—also in the OPFS as
          <code>app-data.json</code>. You can use Download/Import to back up or
          migrate.
        </p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import TotalsCard from "./components/TotalsCard.vue";
import TimesheetPanel from "./components/TimesheetPanel.vue";
import VacationPanel from "./components/VacationPanel.vue";
import { usePersistedAppData } from "./lib/persist";
import type { YearState, TimesheetState, Year } from "./lib/types";
import {
  defaultVacationState,
  defaultYearState,
  DEFAULT_WORKDAY_HOURS,
} from "./lib/types";

const {
  ts,
  opfsSupported,
  opfsStatus,
  downloadJson,
  importJsonFile,
  persistAll,
} = usePersistedAppData();

const today = new Date();
const selectedYear = ref(today.getFullYear());
const selectedMonth = ref(today.getMonth());

const fileInput = ref<HTMLInputElement | null>(null);
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  await importJsonFile(input.files[0]);
  input.value = "";
}

function getTimesheetStateYears(): Year {
  return ts.value.years as TimesheetState;
}

function getTimesheetStateOfYear(year: any): YearState {
  return getTimesheetStateYears()[year] || defaultYearState(year);
}

function getYears(): number[] {
  return Object.keys(getTimesheetStateYears())
    .map(Number)
    .sort((a, b) => a - b);
}

// Year totals for TotalsCard
const yearTotals = computed(() => {
  const yTotals: Record<number, number> = {};
  for (const year in getTimesheetStateYears()) {
    const yState = getTimesheetStateOfYear(year);
    let sum = 0;
    for (const month in yState.months || {}) {
      sum += Object.values(yState.months[month] || {}).reduce(
        (a: number, b: number) => a + (b || 0),
        0
      );
    }
    yTotals[year] = sum;
  }
  return yTotals;
});

const currentYearTotal = computed(
  () => yearTotals.value[selectedYear.value] || 0
);

function getPrevYearCarry(year: number): number {
  const totals = yearTotals.value;
  const prevYears = Object.keys(totals)
    .map(Number)
    .filter((y) => y < year);
  if (prevYears.length > 0) {
    return prevYears.reduce((s, y) => s + (totals[y] || 0), 0);
  }
  // fallback to stored value when no previous-year totals available
  return getTimesheetStateOfYear(year).prevYearCarry;
}

const prevCarry = computed(() => {
  return getPrevYearCarry(selectedYear.value);
});

const grandTotal = computed(() => prevCarry.value + currentYearTotal.value);

// workday hours for selected year
const workdayHours = computed({
  get: () =>
    getTimesheetStateOfYear(selectedYear.value).workdayHours ??
    DEFAULT_WORKDAY_HOURS,
  set: (v) => {
    const year = selectedYear.value;
    const y = getTimesheetStateOfYear(year);
    ts.value.years = { ...ts.value.years, [year]: { ...y, workdayHours: v } };
  },
});

// vac proxy for selected year
const vac = computed({
  get: () =>
    getTimesheetStateOfYear(selectedYear.value).vac ?? defaultVacationState(),
  set: (v) => {
    const year = selectedYear.value;
    const y =
      getTimesheetStateOfYear(year) || defaultYearState(getPrevYearCarry(year));
    ts.value.years = { ...ts.value.years, [year]: { ...y, vac: v } };
  },
});

const vacationComputed = computed(() => {
  const hoursUsed = vac.value.rows.reduce(
    (acc, r) => acc + r.days * workdayHours.value,
    0
  );
  const hoursRemaining = vac.value.systemRemainingHours - hoursUsed;
  const daysRemaining = hoursRemaining / workdayHours.value;
  return { hoursUsed, hoursRemaining, daysRemaining };
});
</script>
