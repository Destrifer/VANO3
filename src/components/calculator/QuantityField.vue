<script setup lang="ts">
// Тираж визитки = плитки-пресеты (QuantitySelect) + строка «Видов» (для листовых).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import QuantitySelect from "./QuantitySelect.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-semibold">Тираж</span>
    <QuantitySelect
      :presets="calc.presets"
      v-model="calc.quantity"
      :per-unit="calc.perUnit"
      :total="calc.result?.total ?? null"
      :total-qty="calc.totalQty"
      :money="calc.money"
    >
      <span class="flex items-center gap-2">
        <span class="text-sm opacity-70">Видов</span>
        <span class="join">
          <button type="button" class="btn btn-sm btn-outline join-item" @click="calc.decViews" :disabled="calc.views <= 1" aria-label="Меньше видов">−</button>
          <span class="btn btn-sm btn-outline join-item pointer-events-none min-w-10">{{ calc.views }}</span>
          <button type="button" class="btn btn-sm btn-outline join-item" @click="calc.incViews" aria-label="Больше видов">+</button>
        </span>
      </span>
    </QuantitySelect>
  </div>
</template>
