<template>
  <div class="bg-neutral-50 rounded-xl p-3 border">
    <div class="text-xs uppercase tracking-wide text-neutral-500">
      {{ label }}
    </div>
    <div
      :class="[
        'text-lg font-semibold',
        props.highlight === 'pos'
          ? 'text-emerald-700'
          : props.highlight === 'neg'
          ? 'text-rose-700'
          : '',
      ]"
    >
      {{ fmt(value) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNum as fmt } from "../lib/utils";
const props = defineProps<{
  label: string;
  value: number;
  highlight?: "pos" | "neg";
}>();
</script>
