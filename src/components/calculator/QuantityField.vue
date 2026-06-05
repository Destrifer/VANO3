<script setup lang="ts">
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Тираж</span>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="q in calc.presets"
        :key="q"
        type="button"
        class="btn h-auto flex-col gap-0 px-4 py-2"
        :class="calc.quantity === q ? 'btn-primary' : 'btn-outline'"
        @click="calc.selectQty(q)"
      >
        <span class="text-base font-bold leading-tight">{{ q }}</span>
        <span class="text-xs font-normal opacity-70" v-if="calc.perUnit(q)">
          {{ calc.perUnit(q)?.toFixed(2) }} ₽/шт
        </span>
      </button>
      <label
        class="btn h-auto flex-col gap-0 px-3 py-2"
        :class="!calc.presets.includes(calc.quantity) ? 'btn-primary' : 'btn-outline'"
      >
        <span class="text-xs font-normal opacity-70">свой</span>
        <input
          type="number"
          v-model.number="calc.quantity"
          min="1"
          class="w-16 bg-transparent text-center text-base font-bold outline-none"
        />
      </label>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm opacity-70">Видов</span>
      <div class="join">
        <button type="button" class="btn btn-sm btn-outline join-item" @click="calc.decViews" :disabled="calc.views <= 1" aria-label="Меньше видов">−</button>
        <span class="btn btn-sm btn-outline join-item pointer-events-none min-w-10">{{ calc.views }}</span>
        <button type="button" class="btn btn-sm btn-outline join-item" @click="calc.incViews" aria-label="Больше видов">+</button>
      </div>
      <span class="text-sm">
        <span class="opacity-70">{{ calc.quantity }} × {{ calc.views }} =</span>
        <span class="font-bold">{{ calc.totalQty }} шт</span>
      </span>
    </div>
  </div>
</template>
