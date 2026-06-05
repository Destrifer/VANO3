<script setup lang="ts">
// Корзина: список позиций, форма оформления (гость), создание заказа на сервере.
import { reactive, ref } from "vue";
import { useStore } from "@nanostores/vue";
import { cartItems, cartTotal, removeFromCart, clearCart } from "../stores/cart";

const items = useStore(cartItems);
const total = useStore(cartTotal);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

const form = reactive({ name: "", phone: "", email: "", comment: "" });
const submitting = ref(false);
const error = ref("");
const orderNumber = ref<string | null>(null);

async function submit() {
  if (submitting.value) return;
  if (!form.name.trim() || !form.phone.trim()) {
    error.value = "Укажите имя и телефон";
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.value.map((it) => ({
          name: it.name,
          spec: it.spec,
          artworkId: it.artworkId,
        })),
        customer: { ...form },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка оформления");
    orderNumber.value = data.number;
    clearCart();
  } catch (e: any) {
    error.value = e?.message ?? "Ошибка оформления";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <!-- Подтверждение -->
  <div v-if="orderNumber" class="my-10 text-center">
    <div class="text-2xl font-bold">Заказ принят</div>
    <p class="mt-2 text-base-content/70">
      Номер заказа: <span class="font-mono font-semibold">{{ orderNumber }}</span>
    </p>
    <p class="mt-1 text-sm text-base-content/60">Менеджер свяжется с вами для подтверждения и оплаты.</p>
    <a href="/" class="btn btn-outline mt-4">На главную</a>
  </div>

  <!-- Корзина + оформление -->
  <div v-else-if="items.length" class="my-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
    <div class="flex flex-col gap-4">
      <div v-for="it in items" :key="it.id" class="card card-border border-base-300">
        <div class="card-body flex-row items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <a :href="`/${it.slug}`" class="link link-hover font-semibold">{{ it.name }}</a>
            <span class="text-sm text-base-content/70">{{ it.summary }}</span>
            <span class="text-sm">{{ it.qty }} шт · {{ it.unitPrice.toFixed(2) }} ₽/шт</span>
            <span v-if="it.artworkId" class="text-xs text-base-content/60">📎 макет приложен</span>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-lg font-bold">{{ money(it.total) }} ₽</span>
            <button class="btn btn-ghost btn-sm" @click="removeFromCart(it.id)">Удалить</button>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm self-start" @click="clearCart">Очистить корзину</button>
    </div>

    <!-- Оформление -->
    <aside class="card card-border border-base-content lg:sticky lg:top-4">
      <div class="card-body gap-3">
        <div class="flex items-baseline justify-between">
          <span class="text-base-content/70">Итого</span>
          <span class="text-2xl font-bold">{{ money(total) }} ₽</span>
        </div>
        <input v-model="form.name" class="input w-full" placeholder="Имя*" />
        <input v-model="form.phone" class="input w-full" placeholder="Телефон*" inputmode="tel" />
        <input v-model="form.email" class="input w-full" placeholder="Email (по желанию)" inputmode="email" />
        <textarea v-model="form.comment" class="textarea w-full" placeholder="Комментарий к заказу" rows="2"></textarea>
        <button class="btn btn-primary btn-block" :disabled="submitting" @click="submit">
          {{ submitting ? "Оформляем…" : "Оформить заказ" }}
        </button>
        <p v-if="error" class="text-sm text-error">{{ error }}</p>
        <p class="text-xs text-base-content/60">Оплата не требуется сейчас — менеджер свяжется для подтверждения.</p>
      </div>
    </aside>
  </div>

  <!-- Пусто -->
  <div v-else class="my-10 text-center text-base-content/60">
    <p class="mb-4">Корзина пуста.</p>
    <a href="/" class="btn btn-outline">Выбрать продукцию</a>
  </div>
</template>
