<script setup lang="ts">
// Постпечать: ламинация (select) + фольгирование (тумблер+цвет) + доп. обработка.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";
import SwatchPalette from "./SwatchPalette.vue";

const calc = inject(calcKey)!;
</script>

<template>
  <!-- Ламинация (одна, select) -->
  <div class="flex flex-col gap-1.5" v-if="calc.laminationOptions.length">
    <span class="text-sm font-semibold">Ламинация</span>
    <select class="select max-w-xs" v-model.number="calc.laminationIndex" :disabled="calc.laminationLocked">
      <option :value="-1">Без ламинации</option>
      <option v-for="(o, i) in calc.laminationOptions" :key="i" :value="i">{{ o.name }}</option>
    </select>
    <!-- место под подсказку зарезервировано всегда — без сдвигов -->
    <span class="text-sm opacity-70 min-h-5" :class="{ invisible: !calc.laminationLocked }">
      С фольгой ламинация фиксируется на Soft Touch.
    </span>
  </div>

  <!-- Фольгирование (тумблер + цвет фольги) -->
  <div class="flex flex-col gap-1.5" v-if="calc.foilOption">
    <span class="text-sm font-semibold">Фольгирование</span>
    <div class="flex min-h-12 flex-wrap items-center gap-3">
      <label class="inline-flex items-center gap-2">
        <input type="checkbox" class="toggle" v-model="calc.foilOn" />
        <span>{{ calc.foilOption.name }}</span>
      </label>
      <SwatchPalette
        v-if="calc.foilOn && calc.foilOption.colors.length"
        :colors="calc.foilOption.colors"
        v-model="calc.foilColorIndex"
      />
    </div>
  </div>

  <!-- Дополнительная обработка -->
  <div class="flex flex-col gap-1.5" v-if="calc.otherOptions.length">
    <span class="text-sm font-semibold">Дополнительная обработка</span>
    <label v-for="{ o, i } in calc.otherOptions" :key="i" class="inline-flex items-center gap-2">
      <input type="checkbox" class="toggle" v-model="calc.fin[i].checked" />
      <span>{{ o.name }}</span>
      <input
        v-if="calc.fin[i].checked && calc.needsCount(o.unit)"
        type="number" class="input input-xs w-20"
        v-model.number="calc.fin[i].count" min="1"
        :title="calc.countLabel[o.unit]"
      />
      <span v-if="calc.fin[i].checked && calc.needsCount(o.unit)" class="text-sm opacity-70">{{ calc.countLabel[o.unit] }}</span>
    </label>
  </div>
</template>
