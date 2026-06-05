<script setup lang="ts">
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Печать</span>
    <div class="flex flex-wrap gap-4">
      <label class="inline-flex items-center gap-2"><input type="radio" class="radio radio-sm" value="4+0" v-model="calc.sides" /> 4+0 (одна сторона)</label>
      <label class="inline-flex items-center gap-2"><input type="radio" class="radio radio-sm" value="4+4" v-model="calc.sides" /> 4+4 (две стороны)</label>
    </div>
  </div>
</template>
