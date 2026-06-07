<script setup lang="ts">
// Презентационный выбор тиража: кнопки-пресеты (с ценой/шт) + «свой». Единый для
// всех калькуляторов. «Виды» (если нужны) добавляет калькулятор-обёртка отдельно.
defineProps<{ presets: number[]; modelValue: number; perUnit: (q: number) => number | null }>();
const emit = defineEmits<{ "update:modelValue": [v: number] }>();
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="q in presets"
      :key="q"
      type="button"
      class="btn h-auto flex-col gap-0 px-4 py-2"
      :class="modelValue === q ? 'btn-primary' : 'btn-outline'"
      @click="emit('update:modelValue', q)"
    >
      <span class="text-base font-bold leading-tight">{{ q }}</span>
      <span class="text-xs font-normal opacity-70" v-if="perUnit(q)">{{ perUnit(q)?.toFixed(2) }} ₽/шт</span>
    </button>
    <label
      class="btn h-auto flex-col gap-0 px-3 py-2"
      :class="!presets.includes(modelValue) ? 'btn-primary' : 'btn-outline'"
    >
      <span class="text-xs font-normal opacity-70">свой</span>
      <input
        type="number" min="1" :value="modelValue"
        @input="emit('update:modelValue', +($event.target as HTMLInputElement).value)"
        class="w-16 bg-transparent text-center text-base font-bold outline-none"
      />
    </label>
  </div>
</template>
