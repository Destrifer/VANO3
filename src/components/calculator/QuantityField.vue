<script setup lang="ts">
// Тираж визитки = слайдер-пресеты (прилипание) + строка «Видов» (для листовых).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import QuantitySlider from "./QuantitySlider.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <span class="text-sm font-semibold">Тираж</span>
      <span class="text-sm" v-if="calc.perUnit(calc.quantity) != null">
        <span class="opacity-70">{{ calc.perUnit(calc.quantity)?.toFixed(2) }} ₽/шт</span>
        <span class="font-bold" v-if="calc.result"> · {{ calc.money(calc.result.total) }} ₽</span>
      </span>
    </div>
    <QuantitySlider :presets="calc.presets" v-model="calc.quantity" />
    <div class="mt-1 flex items-center gap-3">
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
