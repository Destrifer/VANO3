<script setup lang="ts">
// Страница корзины: список позиций (из стора), удаление/очистка, итог.
// Оформление и загрузка макета — этап 2.
import { useStore } from "@nanostores/vue";
import { cartItems, cartTotal, removeFromCart, clearCart } from "../stores/cart";

const items = useStore(cartItems);
const total = useStore(cartTotal);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
</script>

<template>
  <div v-if="items.length" class="my-6 flex flex-col gap-4">
    <div v-for="it in items" :key="it.id" class="card card-border border-base-300">
      <div class="card-body flex-row items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <a :href="`/${it.slug}`" class="link link-hover font-semibold">{{ it.name }}</a>
          <span class="text-sm text-base-content/70">{{ it.summary }}</span>
          <span class="text-sm">{{ it.qty }} шт · {{ it.unitPrice.toFixed(2) }} ₽/шт</span>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="text-lg font-bold">{{ money(it.total) }} ₽</span>
          <button class="btn btn-ghost btn-sm" @click="removeFromCart(it.id)">Удалить</button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-base-content pt-4">
      <button class="btn btn-ghost btn-sm" @click="clearCart">Очистить</button>
      <div class="text-right">
        <div class="text-2xl font-bold">{{ money(total) }} ₽</div>
        <button class="btn btn-primary mt-2" disabled>Оформить заказ</button>
      </div>
    </div>
    <p class="text-xs text-base-content/60">Оформление и загрузка макета — на следующем шаге.</p>
  </div>

  <div v-else class="my-10 text-center text-base-content/60">
    <p class="mb-4">Корзина пуста.</p>
    <a href="/" class="btn btn-outline">Выбрать продукцию</a>
  </div>
</template>
