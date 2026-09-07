<template>
  <div class="bg-white rounded-2xl shadow p-4">
    <h2 class="text-lg font-semibold mb-3">Ferien</h2>

    <div class="space-y-3 mb-4">
      <div class="flex items-center justify-between gap-3">
        <label for="workday" class="text-sm text-neutral-600"
          >Arbeitsstunden pro Tag</label
        >
        <NumberField id="workday" v-model="workdayHoursProxy" :step="0.1" />
        <NumberField
          id="remainingHours"
          v-model="systemRemainingHoursProxy"
          :step="0.1"
        />
      </div>
    </div>

    <div class="mb-2 flex items-center justify-between">
      <div class="text-sm font-medium">Geplante Ferien</div>
      <button
        @click="addRow"
        class="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm"
      >
        Zeile hinzufügen
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm table-fixed">
        <thead>
          <tr class="text-left text-neutral-500">
            <th class="py-2 pr-3 w-32">Start</th>
            <th class="py-2 pr-3 w-32">Ende</th>
            <th class="py-2 pr-3">Bezeichnung</th>
            <th class="py-2 pr-3 w-24 text-right">Arbeitstage</th>
            <th class="py-2 pr-3 w-24 text-right">Stunden</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="vacation.rows.length === 0">
            <td colspan="4" class="py-4 text-neutral-500">
              Keine Einträge – füge oben Zeilen hinzu.
            </td>
          </tr>
          <tr v-for="r in sortedRows" :key="r.id" class="border-t">
            <td class="py-2 pr-3">
              <input
                type="date"
                class="px-2 py-1.5 rounded-lg border w-full"
                :value="r.startDate"
                @change="onDateChange(r.id, 'startDate', $event)"
              />
            </td>
            <td class="py-2 pr-3">
              <input
                type="date"
                class="px-2 py-1.5 rounded-lg border w-full"
                :value="r.endDate"
                @change="onDateChange(r.id, 'endDate', $event)"
              />
            </td>
            <td class="py-2 pr-3">
              <input
                class="px-2 py-1.5 rounded-lg border w-full"
                v-model="r.label"
              />
            </td>
            <td class="py-2 pr-3 text-right">
              <input
                inputmode="decimal"
                class="px-2 py-1.5 rounded-lg border w-full text-right"
                :value="dayInputValue(r)"
                @input="onDaysInput(r.id, $event)"
                @blur="onDaysBlur(r.id)"
              />
            </td>
            <td class="py-2 pr-3 text-right">
              {{ formatNum(r.days * workdayHours) }}
            </td>
            <td class="py-2 text-right">
              <button
                @click="deleteRow(r.id)"
                class="px-2 py-1 rounded-lg hover:bg-neutral-100"
              >
                <TrashIcon class="w-5 h-5" style="color: red" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <Stat label="Geplante Stunden" :value="stats.hoursUsed" />
      <Stat
        label="Verbleibende Stunden"
        :value="stats.hoursRemaining"
        :highlight="stats.hoursRemaining >= 0 ? 'pos' : 'neg'"
      />
      <Stat label="Verbleibende Tage" :value="stats.daysRemaining" />
    </div>
  </div>
</template>

<script setup lang="ts">
import NumberField from "./NumberField.vue";
import Stat from "./Stat.vue";
import { computed, ref } from "vue";
import type { VacationRow, VacationState } from "../lib/types";
import {
  clampNumber,
  countWorkdays,
  formatNum,
  getLastVacationEndDate,
  getNextWorkday,
  todayDateString,
  uid,
} from "../lib/utils";
import { TrashIcon } from "@heroicons/vue/24/outline";

const { vacation, workdayHours, stats } = defineProps<{
  vacation: VacationState;
  workdayHours: number;
  stats: {
    hoursUsed: number;
    hoursRemaining: number;
    daysRemaining: number;
  };
}>();

const emit = defineEmits<{
  "update:vacation": [val: VacationState];
  "update:workdayHours": [val: number];
}>();

// 🔧 Computed proxies for v-model on child inputs
const workdayHoursProxy = computed<number>({
  get: () => workdayHours,
  set: (v) => emit("update:workdayHours", v),
});

const systemRemainingHoursProxy = computed<number>({
  get: () => vacation.systemRemainingHours,
  set: (v) => emit("update:vacation", { ...vacation, systemRemainingHours: v }),
});

const dayInputDrafts = ref<Record<string, string>>({});

function dayInputValue(row: VacationRow) {
  return dayInputDrafts.value[row.id] ?? String(row.days);
}

function onDaysInput(id: string, event: Event) {
  const input = (event.target as HTMLInputElement).value;
  dayInputDrafts.value[id] = input;
  updateRow(id, { days: clampNumber(input) });
}

function onDaysBlur(id: string) {
  delete dayInputDrafts.value[id];
}

function onDateChange(id: string, field: "startDate" | "endDate", event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const row = vacation.rows.find((currentRow) => currentRow.id === id);
  if (!row) return;

  const startDate = field === "startDate" ? value : row.startDate;
  const endDate = field === "endDate" ? value : row.endDate;
  updateRow(id, {
    [field]: value,
    days: countWorkdays(startDate, endDate),
  });
}

function sortRows(rows: VacationRow[]) {
  const sentinel = "9999-12-31";
  return rows.slice().sort((a, b) => {
    const ka =
      a.startDate && a.startDate.trim() !== "" ? a.startDate : sentinel;
    const kb =
      b.startDate && b.startDate.trim() !== "" ? b.startDate : sentinel;
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}

const sortedRows = computed(() => sortRows(vacation.rows));

function commitRows(rows: VacationRow[]) {
  emit("update:vacation", { ...vacation, rows: sortRows(rows) });
}

function addRow() {
  const lastVacationEndDate = getLastVacationEndDate(
    sortedRows.value,
    todayDateString(),
  );
  const startDate = getNextWorkday(lastVacationEndDate);
  commitRows([
    ...vacation.rows,
    {
      id: uid(),
      label: "Ferien",
      days: countWorkdays(startDate, startDate),
      startDate,
      endDate: startDate,
    },
  ]);
}
function updateRow(id: string, patch: Partial<VacationRow>) {
  commitRows(vacation.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}
function deleteRow(id: string) {
  commitRows(vacation.rows.filter((r) => r.id !== id));
}
</script>
