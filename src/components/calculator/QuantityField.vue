<script setup lang="ts">
// Тираж визитки = общий QuantitySelect + строка «Видов» (специфично для листовых).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import QuantitySelect from "./QuantitySelect.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Тираж</span>
    <QuantitySelect :presets="calc.presets" v-model="calc.quantity" :per-unit="calc.perUnit" />
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
