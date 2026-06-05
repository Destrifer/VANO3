<script setup lang="ts">
// Плашка заказа: итог + действие «В корзину». Результат — позиция для корзины.
import { inject } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;

function addToCart() {
  // TODO: подключить корзину (следующая задача).
  // Позиция = buildConfig(totalQty) + цена + данные продукта.
}
</script>

<template>
  <aside class="card card-border border-base-content">
    <div class="card-body gap-3">
      <template v-if="calc.result">
        <div class="text-3xl font-bold leading-tight">{{ calc.money(calc.result.total) }} ₽</div>
        <div class="text-sm text-base-content/60">
          {{ (calc.result.total / calc.totalQty).toFixed(2) }} ₽/шт · {{ calc.totalQty }} шт · срок 1–3 раб. дня
        </div>

        <button class="btn btn-primary btn-block" @click="addToCart">В корзину</button>

        <ul class="flex flex-col gap-1.5 text-sm">
          <li v-for="(l, i) in calc.result.lines" :key="i" class="flex justify-between gap-4 border-b border-base-300 pb-1">
            <span>{{ l.label }}</span><span>{{ calc.money(l.amount) }} ₽</span>
          </li>
        </ul>
        <p class="text-xs text-base-content/60">Предварительный расчёт. Точная цена — после проверки макета.</p>
      </template>
      <p v-else class="text-sm text-base-content/60">Заполните параметры для расчёта.</p>
    </div>
  </aside>
</template>
