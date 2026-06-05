<script setup lang="ts">
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Размер</span>
    <div class="flex flex-wrap items-center gap-3">
      <!-- Слот фикс. ширины: select ↔ диаметр ↔ свой размер на месте -->
      <div class="w-72 max-w-full">
        <div v-if="calc.shape === 'round'" class="flex items-center gap-2">
          <span class="text-sm opacity-70">⌀</span>
          <input type="number" class="input w-20" v-model.number="calc.diameter" min="1" />
          <span class="text-sm opacity-70">мм</span>
        </div>
        <div v-else-if="calc.customMode" class="flex items-center gap-2">
          <input type="number" class="input w-20" v-model.number="calc.customW" min="1" />
          <span>×</span>
          <input type="number" class="input w-20" v-model.number="calc.customH" min="1" />
          <span class="text-sm opacity-70">мм</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="calc.backToList">из списка</button>
        </div>
        <select v-else class="select w-full" v-model.number="calc.sizeIndex" @change="calc.onSizeChange">
          <option v-for="(s, i) in calc.product.sizes" :key="i" :value="i">{{ s.label }}</option>
          <option v-if="calc.product.allowCustom" :value="-1">Свой размер…</option>
        </select>
      </div>

      <!-- Переключатель формы (btn md = высоте select) -->
      <div class="join" v-if="calc.shapes.length > 1">
        <button
          v-for="s in calc.shapes"
          :key="s.value"
          type="button"
          class="btn join-item"
          :class="calc.shape === s.value ? 'btn-primary' : 'btn-outline'"
          @click="calc.shape = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
  </div>
</template>
