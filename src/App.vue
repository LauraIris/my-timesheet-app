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
          :prev-year-carry="currentPrevCarry"
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
            v-model:sel-year="selYear"
            v-model:sel-m0="selM0"
          />
        </section>
        <aside class="md:col-span-1">
          <VacationPanel v-model:vac="vac" :computed="vacationComputed" />
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

const {
  ts,
  opfsSupported,
  opfsStatus,
  downloadJson,
  importJsonFile,
  persistAll,
} = usePersistedAppData();

const today = new Date();
const selYear = ref(today.getFullYear());
const selM0 = ref(today.getMonth());

const fileInput = ref<HTMLInputElement | null>(null);
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  await importJsonFile(input.files[0]);
  input.value = "";
}

// Year totals for TotalsCard
const yearTotals = computed(() => {
  const yTotals: Record<number, number> = {};
  for (const yKey in ts.value.years) {
    const y = Number(yKey);
    const yState = ts.value.years[y] || ({ months: {} } as any);
    let sum = 0;
    for (const mKey in yState.months || {}) {
      sum += Object.values(yState.months[mKey] || {}).reduce(
        (a: number, b: number) => a + (b || 0),
        0
      );
    }
    yTotals[y] = sum;
  }
  return yTotals;
});

const currentYearTotal = computed(() => yearTotals.value[selYear.value] || 0);
const currentPrevCarry = computed(
  () => ts.value.years[selYear.value]?.prevYearCarry ?? 0
);
const grandTotal = computed(
  () => currentPrevCarry.value + currentYearTotal.value
);

// vac proxy for selected year
const vac = computed({
  get: () =>
    ts.value.years[selYear.value]?.vac ?? {
      workdayHours: 8.4,
      systemRemainingHours: 87.5,
      rows: [],
    },
  set: (v) => {
    const year = selYear.value;
    const y = ts.value.years[year] || {
      months: {},
      prevYearCarry: 0,
      vac: { workdayHours: 8.4, systemRemainingHours: 87.5, rows: [] },
    };
    ts.value.years = { ...ts.value.years, [year]: { ...y, vac: v } };
  },
});

const vacationComputed = computed(() => {
  const hoursUsed = vac.value.rows.reduce(
    (acc, r) => acc + r.days * vac.value.workdayHours,
    0
  );
  const hoursRemaining = vac.value.systemRemainingHours - hoursUsed;
  const daysRemaining = hoursRemaining / vac.value.workdayHours;
  return { hoursUsed, hoursRemaining, daysRemaining };
});
</script>
