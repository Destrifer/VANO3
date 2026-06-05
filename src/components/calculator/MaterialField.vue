<script setup lang="ts">
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import SwatchPalette from "./SwatchPalette.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Материал</span>
    <div class="flex flex-wrap items-center gap-3">
      <select class="select max-w-xs" v-model.number="calc.paperIndex">
        <optgroup v-for="g in calc.paperGroups" :key="g.group" :label="g.group">
          <option v-for="o in g.options" :key="o.index" :value="o.index">{{ o.name }}</option>
        </optgroup>
      </select>

      <SwatchPalette v-if="calc.colors.length" :colors="calc.colors" v-model="calc.selectedColorIndex" />
    </div>
  </div>
</template>
