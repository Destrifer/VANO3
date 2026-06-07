<script setup lang="ts">
// Фальцовка (буклеты): выбор типа сложения. Число сгибов определяет цену
// (per_fold-отделка) и показывается рядом. Печать буклета всегда 4+4.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
const foldWord = (n: number) => (n === 1 ? "сгиб" : n < 5 ? "сгиба" : "сгибов");
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Фальцовка</span>
    <select class="select max-w-xs" v-model.number="calc.foldTypeIndex">
      <option v-for="(f, i) in calc.foldTypes" :key="i" :value="i">
        {{ f.name }} — {{ f.folds }} {{ foldWord(f.folds) }}
      </option>
    </select>
  </div>
</template>
