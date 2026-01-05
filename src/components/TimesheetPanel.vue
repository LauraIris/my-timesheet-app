<template>
  <div class="bg-white rounded-2xl shadow p-4">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4"
    >
      <div class="flex flex-wrap gap-2 items-center">
        <label for="yearSelect" class="text-sm text-neutral-600">Jahr</label>
        <select
          id="yearSelect"
          class="px-3 py-2 rounded-xl border bg-white"
          :value="selYear"
          @change="onYearChange"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-sm text-neutral-600">
          YTD-Sum (Jan–{{ monthName(currentMonth0) }}):
        </div>
        <div
          :class="[
            'text-lg font-semibold',
            ytdTotal >= 0 ? 'text-emerald-700' : 'text-rose-700',
          ]"
        >
          {{ formatNum(ytdTotal) }}
        </div>
      </div>
    </div>

    <!-- Year-to-date months -->
    <div v-for="m0 in monthsToShow" :key="m0" class="mb-8">
      <div class="flex items-baseline gap-4 mb-2">
        <h3 class="text-base font-semibold">
          {{ monthLabel(selYear, m0) }}
        </h3>
        <span
          v-if="isCurrentMonth(m0)"
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
        >
          current
        </span>
        <div class="text-sm text-neutral-600">
          Monat Total:
          <span
            :class="[
              monthTotal(m0) >= 0 ? 'text-emerald-700' : 'text-rose-700',
              'font-medium',
            ]"
          >
            {{ formatNum(monthTotal(m0)) }}
          </span>
        </div>
      </div>

      <!-- Horizontal days row -->
      <div class="overflow-x-auto pb-2">
        <div class="flex gap-2 min-w-max items-stretch" style="margin: 2px">
          <!-- key on <template>, not on children -->
          <template
            v-for="(d, idx) in weekdayDayArray(selYear, m0)"
            :key="`frag-${d}`"
          >
            <!-- slim divider before each Monday, but not before the first rendered cell -->
            <div
              v-if="isMonday(selYear, m0, d) && idx !== 0"
              class="w-px bg-neutral-300/70 self-stretch mx-1"
              aria-hidden="true"
            ></div>

            <!-- day card (no extra :key here) -->
            <div
              :class="[
                'p-2 rounded-xl border shrink-0 w-20',
                isToday(selYear, m0, d)
                  ? 'ring-2 ring-indigo-500 bg-indigo-50'
                  : isWeekend(selYear, m0, d)
                  ? 'bg-neutral-50'
                  : isCurrentMonth(m0)
                  ? 'bg-amber-50'
                  : 'bg-white',
              ]"
            >
              <div class="text-center text-xs mb-1">
                <div class="font-medium">{{ d }}.{{ m0 + 1 }}.</div>
                <div class="text-neutral-500">
                  {{ weekdayShort(selYear, m0, d) }}
                </div>
              </div>
              <input
                inputmode="decimal"
                type="text"
                class="w-full text-center px-3 py-1.5 rounded-lg border outline-none focus:ring"
                :class="
                  isWeekend(selYear, m0, d) ? 'bg-neutral-100' : 'bg-white'
                "
                :value="String(dayValue(m0, d) ?? 0)"
                @blur="(e:any) => commitDay(m0, d, e.target.value)"
                @keydown.enter.prevent="(e:any) => commitDay(m0, d, e.target.value)"
                @change="(e:any) => commitDay(m0, d, e.target.value)"
                :aria-label="`Hours on ${d}.${m0 + 1}.${selYear}`"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- PrevYear Carry -->
    <div class="mt-6 flex items-center gap-3">
      <label :for="carryId" class="text-sm text-neutral-600"
        >Vorjahr (Carry):</label
      >
      <div
        id="carry-display"
        class="px-3 py-2 rounded-xl border bg-neutral-100 w-28 text-right font-medium"
      >
        {{ formatNum(prevYearCarry ?? 0) }}
      </div>
      <span class="text-xs text-neutral-500">Stunden</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue"; // add ref
import { defaultYearState, type TimesheetState } from "../lib/types";
import {
  formatNum,
  getDaysInMonth,
  monthLabel,
  monthName,
  weekdayShort,
  isWeekend,
} from "../lib/utils";

const props = defineProps<{
  ts: TimesheetState;
  selYear: number;
  selM0: number;
  prevYearCarry?: number;
}>();
const emit = defineEmits<{
  "update:ts": [val: TimesheetState];
  "update:selYear": [val: number];
  "update:selM0": [val: number];
}>();

function ensureMonth(year: number, monthIndex0: number) {
  const y = props.ts.years[year] || defaultYearState(year);
  const months = { ...y.months };
  if (!months[monthIndex0]) {
    const dim = getDaysInMonth(year, monthIndex0);
    const blank: Record<number, number> = {};
    for (let d = 1; d <= dim; d++) blank[d] = 0;
    months[monthIndex0] = blank;
    emit("update:ts", {
      ...props.ts,
      years: {
        ...props.ts.years,
        [year]: { ...y, months },
      },
    });
  }
}

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth0 = now.getMonth();
const yearOptions = computed(() => {
  const keys = Object.keys(props.ts.years).map(Number);
  const s = new Set<number>(keys);
  s.add(currentYear);
  return Array.from(s).sort((a, b) => a - b);
});
const currentDay = now.getDate();

// Build arrays of days
function dayArray(year: number, m0: number) {
  return Array.from({ length: getDaysInMonth(year, m0) }, (_, i) => i + 1);
}
function weekdayDayArray(year: number, m0: number) {
  return dayArray(year, m0).filter((d) => !isWeekend(year, m0, d));
}

const monthsToShow = computed<number[]>(() => {
  if (props.selYear === currentYear)
    return Array.from({ length: currentMonth0 + 1 }, (_, i) => i);
  return Array.from({ length: 12 }, (_, i) => i);
});

function isCurrentMonth(m0: number) {
  return props.selYear === currentYear && m0 === currentMonth0;
}

function isToday(year: number, monthIndex0: number, d: number) {
  return (
    year === currentYear && monthIndex0 === currentMonth0 && d === currentDay
  );
}

function isMonday(year: number, monthIndex0: number, d: number) {
  return new Date(year, monthIndex0, d).getDay() === 1; // 1 = Monday
}

watch(
  () => [props.selYear, monthsToShow.value] as const,
  () => {
    for (const m0 of monthsToShow.value) ensureMonth(props.selYear, m0);
  },
  { immediate: true }
);

function dayValue(m0: number, d: number) {
  const months = props.ts.years[props.selYear]?.months || {};
  return months[m0]?.[d] ?? 0;
}

function monthTotal(m0: number) {
  const months = props.ts.years[props.selYear]?.months || {};
  const days = months[m0] || {};
  return Object.values(days).reduce((a: number, b: number) => a + (b || 0), 0);
}
const ytdTotal = computed(() =>
  monthsToShow.value.reduce(
    (sum: number, m0: number) => sum + monthTotal(m0),
    0
  )
);

function onYearChange(e: Event) {
  const y = Number((e.target as HTMLSelectElement).value);
  emit("update:selYear", y);
  emit("update:selM0", y === currentYear ? currentMonth0 : 11);
}

const carryId = `carry-${props.selYear}`;

function commitDay(m0: number, d: number, raw: string) {
  // accept both 5.5 and 5,5
  const normalized = raw.replace(",", ".").trim();
  const num = Number(normalized);
  const val = Number.isFinite(num) ? num : 0;
  const y = props.ts.years[props.selYear] || {
    months: {},
    prevYearCarry: 0,
    workdayHours: 8.4,
    vac: { systemRemainingHours: 87.5, rows: [] },
  };
  const months = { ...y.months };
  const month = { ...months[m0], [d]: val };
  months[m0] = month;
  emit("update:ts", {
    ...props.ts,
    years: { ...props.ts.years, [props.selYear]: { ...y, months } },
  });
}
</script>
