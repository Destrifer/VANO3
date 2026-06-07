<script setup lang="ts">
// Контурная резка (наклейки): надсечка по контуру, чтобы наклейку было легко
// отделить от подложки. +50% к стоимости резки (учитывает движок).
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Резка</span>
    <label class="inline-flex items-center gap-2">
      <input type="checkbox" class="toggle" v-model="calc.contourCut" />
      <span>Контурная — легко отделить от подложки <span class="opacity-60">(+50% к резке)</span></span>
    </label>
  </div>
</template>
