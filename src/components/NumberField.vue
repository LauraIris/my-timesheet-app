<template>
  <input
    :id="id"
    inputmode="decimal"
    :step="step"
    class="px-3 py-2 rounded-xl border bg-white w-28 text-right"
    :value="String(modelValue)"
    @input="onInput"
  />
</template>

<script setup lang="ts">
import { clampNumber } from "../lib/utils";

// Destructure defineProps (no toRefs)
const {
  modelValue,
  step = 0.05,
  id,
} = defineProps<{ modelValue: number; step?: number; id?: string }>();

const emit = defineEmits<{ "update:modelValue": [val: number] }>();

function onInput(e: Event) {
  emit("update:modelValue", clampNumber((e.target as HTMLInputElement).value));
}
</script>
