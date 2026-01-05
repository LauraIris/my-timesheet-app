<template>
  <div class="bg-white rounded-2xl shadow p-4 w-full md:w-auto">
    <div class="grid grid-cols-3 gap-4 text-center">
      <div>
        <div class="text-xs uppercase tracking-wide text-neutral-500">
          Vorjahre (Summe)
        </div>
        <div class="text-lg font-semibold">{{ formatNum(prevYearCarry) }}</div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-neutral-500">
          Aktuelles Jahr
        </div>
        <div class="text-lg font-semibold">
          {{ formatNum(currentYearTotal) }}
        </div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-neutral-500">
          TOTAL
        </div>
        <div
          :class="[
            'text-lg font-semibold',
            grandTotal >= 0 ? 'text-emerald-700' : 'text-rose-700',
          ]"
        >
          {{ formatNum(grandTotal) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNum } from "../lib/utils";

// No toRefs needed — destructure props directly (Vue 3.3+)
const { prevYearCarry, currentYearTotal, grandTotal } = defineProps<{
  prevYearCarry: number;
  currentYearTotal: number;
  grandTotal: number;
}>();
</script>
