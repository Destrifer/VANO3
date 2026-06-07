<script setup lang="ts">
// Презентационный выбор сторон печати (4+0 / 4+4). Единый для всех калькуляторов.
type Sides = "4+0" | "4+4";
defineProps<{ label?: string; modelValue: Sides }>();
const emit = defineEmits<{ "update:modelValue": [v: Sides] }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Печать" }}</span>
    <div class="flex flex-wrap gap-4">
      <label class="inline-flex items-center gap-2">
        <input type="radio" class="radio radio-sm" :checked="modelValue === '4+0'" @change="emit('update:modelValue', '4+0')" />
        4+0 (одна сторона)
      </label>
      <label class="inline-flex items-center gap-2">
        <input type="radio" class="radio radio-sm" :checked="modelValue === '4+4'" @change="emit('update:modelValue', '4+4')" />
        4+4 (две стороны)
      </label>
    </div>
  </div>
</template>
