<script setup lang="ts">
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
</script>

<template>
  <aside class="card card-border border-base-content sticky top-4 self-start">
    <div class="card-body">
      <template v-if="calc.result">
        <div class="text-3xl font-bold leading-tight">{{ calc.money(calc.result.total) }} ₽</div>
        <div class="text-base-content/60">{{ (calc.result.total / calc.totalQty).toFixed(2) }} ₽/шт · {{ calc.totalQty }} шт · {{ calc.result.sheets }} листов</div>
        <ul class="mt-2 flex flex-col gap-1.5 text-sm">
          <li v-for="(l, i) in calc.result.lines" :key="i" class="flex justify-between gap-4 border-b border-base-300 pb-1">
            <span>{{ l.label }}</span><span>{{ calc.money(l.amount) }} ₽</span>
          </li>
        </ul>
        <p class="mt-2 text-sm text-base-content/60">Предварительный расчёт. Точная цена — после проверки макета.</p>
      </template>
      <p v-else class="text-sm text-base-content/60">Заполните параметры для расчёта.</p>
    </div>
  </aside>
</template>
