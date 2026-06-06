<script setup lang="ts">
// Корзина + оформление: позиции, доставка (с адресом для курьера/РФ), оплата,
// контакты. Создание заказа на сервере (он пересчитывает цену и доставку).
import { computed, reactive, ref } from "vue";
import { useStore } from "@nanostores/vue";
import { cartItems, cartTotal, removeFromCart, clearCart } from "../stores/cart";
import { DELIVERY_METHODS, PAYMENT_METHODS, findDelivery, deliveryCost } from "../lib/checkout";
import AddressField from "./AddressField.vue";

const items = useStore(cartItems);
const goodsTotal = useStore(cartTotal);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

const delivery = reactive({
  method: "pickup",
  address: "",
  data: null as Record<string, any> | null,
  apartment: "",
  entrance: "",
  floor: "",
  intercom: "",
  pvzPref: "", // желаемый ПВЗ/постамат (текст)
});
const payment = reactive({ method: "on_receipt" });
const contact = reactive({ name: "", phone: "", email: "", comment: "" });

const submitting = ref(false);
const error = ref("");
const orderNumber = ref<string | null>(null);

const selectedDelivery = computed(() => findDelivery(delivery.method));
const delCost = computed(() => deliveryCost(delivery.method)); // null = уточнит менеджер
const grandTotal = computed(() => goodsTotal.value + (delCost.value ?? 0));

function onAddressSelect(s: { value: string; data: Record<string, any> }) {
  delivery.data = s.data;
}
function composeAddress() {
  const m = selectedDelivery.value;
  if (!m?.needsAddress) return "";
  const parts = [delivery.address];
  if (m.type === "courier") {
    if (delivery.apartment) parts.push(`кв./офис ${delivery.apartment}`);
    if (delivery.entrance) parts.push(`подъезд ${delivery.entrance}`);
    if (delivery.floor) parts.push(`этаж ${delivery.floor}`);
    if (delivery.intercom) parts.push(`домофон ${delivery.intercom}`);
  } else if (m.type === "pvz" && delivery.pvzPref) {
    parts.push(`пункт: ${delivery.pvzPref}`);
  }
  return parts.filter(Boolean).join(", ");
}

async function submit() {
  if (submitting.value) return;
  if (!contact.name.trim() || !contact.phone.trim()) {
    error.value = "Укажите имя и телефон";
    return;
  }
  if (selectedDelivery.value?.needsAddress && !delivery.address.trim()) {
    error.value = "Укажите адрес доставки";
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
          name: it.name, spec: it.spec, artworkId: it.artworkId, preflight: it.preflight,
        })),
        customer: { ...contact },
        delivery: {
          method: delivery.method,
          address: composeAddress(),
          data: {
            ...(delivery.data ?? {}),
            apartment: delivery.apartment || null,
            entrance: delivery.entrance || null,
            floor: delivery.floor || null,
            intercom: delivery.intercom || null,
          },
        },
        payment: { method: payment.method },
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

  <div v-else-if="items.length" class="my-6 grid gap-8 lg:grid-cols-[1fr_460px] lg:items-start">
    <!-- Левая колонка: только товары -->
    <div class="flex flex-col gap-3">
      <div v-for="it in items" :key="it.id" class="card card-border border-base-300">
        <div class="card-body flex-row items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <a :href="`/${it.slug}`" class="link link-hover font-semibold">{{ it.name }}</a>
            <span class="text-sm text-base-content/70">{{ it.summary }}</span>
            <span class="text-sm">{{ it.qty }} шт · {{ it.unitPrice.toFixed(2) }} ₽/шт</span>
            <span v-if="it.artworkId" class="text-xs text-base-content/60">
              📎 макет приложен
              <span v-if="it.preflight">· {{ it.preflight.status === "green" ? "🟢" : it.preflight.status === "yellow" ? "🟡" : "🔴" }}</span>
            </span>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-lg font-bold">{{ money(it.total) }} ₽</span>
            <button class="btn btn-ghost btn-sm" @click="removeFromCart(it.id)">Удалить</button>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm self-start" @click="clearCart">Очистить корзину</button>
    </div>

    <!-- Правая колонка: оформление (доставка + оплата + контакты + итог) -->
    <aside class="card card-border border-base-content">
      <div class="card-body gap-5">
        <!-- Доставка -->
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Доставка</span>
          <label v-for="m in DELIVERY_METHODS" :key="m.id" class="flex items-center gap-2">
            <input type="radio" class="radio radio-sm" :value="m.id" v-model="delivery.method" />
            <span>{{ m.label }}</span>
            <span class="text-sm text-base-content/60">
              {{ m.costType === "free" ? "бесплатно" : m.costType === "fixed" ? `${money(m.cost)} ₽` : "уточнит менеджер" }}
              <template v-if="m.note">· {{ m.note }}</template>
            </span>
          </label>
          <!-- курьер: адрес + детали дома -->
          <div v-if="selectedDelivery?.type === 'courier'" class="mt-1 flex flex-col gap-2">
            <AddressField v-model="delivery.address" @select="onAddressSelect" />
            <div class="flex flex-wrap gap-2">
              <input v-model="delivery.apartment" class="input input-sm w-28" placeholder="Кв./офис" />
              <input v-model="delivery.entrance" class="input input-sm w-28" placeholder="Подъезд" />
              <input v-model="delivery.floor" class="input input-sm w-24" placeholder="Этаж" />
              <input v-model="delivery.intercom" class="input input-sm w-32" placeholder="Домофон" />
            </div>
          </div>

          <!-- ПВЗ/постамат: город + пожелание по пункту -->
          <div v-else-if="selectedDelivery?.type === 'pvz'" class="mt-1 flex flex-col gap-2">
            <AddressField v-model="delivery.address" @select="onAddressSelect" placeholder="Город или район" />
            <input v-model="delivery.pvzPref" class="input w-full" placeholder="Желаемый ПВЗ/постамат (адрес или сеть) — по желанию" />
            <span class="text-xs text-base-content/60">Менеджер подберёт ближайший пункт и сообщит стоимость.</span>
          </div>
        </div>

        <!-- Оплата -->
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Оплата</span>
          <label v-for="m in PAYMENT_METHODS" :key="m.id" class="flex items-center gap-2"
                 :class="{ 'opacity-50': !m.available }">
            <input type="radio" class="radio radio-sm" :value="m.id" v-model="payment.method" :disabled="!m.available" />
            <span>{{ m.label }}</span>
            <span v-if="m.note" class="text-sm text-base-content/60">· {{ m.note }}</span>
          </label>
        </div>

        <!-- Контакты -->
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Контакты</span>
          <input v-model="contact.name" class="input w-full" placeholder="Имя*" />
          <input v-model="contact.phone" class="input w-full" placeholder="Телефон*" inputmode="tel" />
          <input v-model="contact.email" class="input w-full" placeholder="Email (по желанию)" inputmode="email" />
          <textarea v-model="contact.comment" class="textarea w-full" placeholder="Комментарий к заказу" rows="2"></textarea>
        </div>

        <!-- Итог -->
        <div class="flex flex-col gap-2 border-t border-base-300 pt-3">
          <div class="flex justify-between text-sm">
            <span class="text-base-content/70">Товары</span><span>{{ money(goodsTotal) }} ₽</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-base-content/70">Доставка</span>
            <span>{{ delCost === null ? "уточнит менеджер" : delCost === 0 ? "бесплатно" : money(delCost) + " ₽" }}</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-base-content/70">Итого</span>
            <span class="text-2xl font-bold">{{ money(grandTotal) }} ₽</span>
          </div>
          <button class="btn btn-primary btn-block" :disabled="submitting" @click="submit">
            {{ submitting ? "Оформляем…" : "Оформить заказ" }}
          </button>
          <p v-if="error" class="text-sm text-error">{{ error }}</p>
          <p class="text-xs text-base-content/60">Оплата не требуется сейчас — менеджер свяжется для подтверждения.</p>
        </div>
      </div>
    </aside>
  </div>

  <!-- Пусто -->
  <div v-else class="my-10 text-center text-base-content/60">
    <p class="mb-4">Корзина пуста.</p>
    <a href="/" class="btn btn-outline">Выбрать продукцию</a>
  </div>
</template>
