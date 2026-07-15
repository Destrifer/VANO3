<script setup lang="ts">
// Корзина + оформление: позиции, доставка (с адресом для курьера/РФ), оплата,
// контакты. Создание заказа на сервере (он пересчитывает цену и доставку).
import { computed, reactive, ref, onMounted } from "vue";
import { useStore } from "@nanostores/vue";
import { cartItems, cartTotal, removeFromCart, clearCart } from "../stores/cart";
import { DELIVERY_METHODS, PAYMENT_METHODS, PVZ_NETWORKS, COURIER_SERVICES, findDelivery, effectiveDeliveryCost, freeDeliveryProgress, FREE_DELIVERY_DEFAULT, pvzLabel, courierLabel, type DeliveryMethod } from "../lib/checkout";
import AddressField from "./AddressField.vue";

const items = useStore(cartItems);
const goodsTotal = useStore(cartTotal);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

// Порог бесплатной доставки — из мета-тега (авторитетно сервер пересчитает при заказе).
const threshold = ref(FREE_DELIVERY_DEFAULT);
onMounted(() => {
  const m = document.querySelector('meta[name="free-delivery-threshold"]')?.getAttribute("content");
  if (m) threshold.value = Number(m) || FREE_DELIVERY_DEFAULT;
});
const freeProgress = computed(() => freeDeliveryProgress(goodsTotal.value, threshold.value));
// Подпись стоимости способа с учётом порога (курьер по Москве бесплатнеет от суммы).
function methodCostLabel(m: DeliveryMethod): string {
  const c = effectiveDeliveryCost(m.id, goodsTotal.value, threshold.value);
  if (c === null) return "уточнит менеджер";
  return c === 0 ? "бесплатно" : `${money(c)} ₽`;
}
const selectedPvzHint = computed(() => PVZ_NETWORKS.find((n) => n.id === delivery.pvzNetwork));

const delivery = reactive({
  method: "pickup",
  address: "",
  data: null as Record<string, any> | null,
  apartment: "",
  entrance: "",
  floor: "",
  intercom: "",
  courierService: "", // предпочтительная служба курьера (по желанию)
  pvzNetwork: "yandex", // сеть ПВЗ/постаматов
});
const payment = reactive({ method: "on_receipt", requisitesFileId: null as string | null, requisitesName: "" });
const reqStatus = ref<"idle" | "uploading" | "error">("idle");
const reqError = ref("");

async function onRequisitesChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  reqStatus.value = "uploading";
  reqError.value = "";
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-doc", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.fileId) throw new Error(data.error || "Ошибка загрузки");
    payment.requisitesFileId = data.fileId;
    payment.requisitesName = data.fileName ?? file.name;
    reqStatus.value = "idle";
  } catch (err: any) {
    reqStatus.value = "error";
    reqError.value = err?.message ?? "Ошибка загрузки";
  } finally {
    input.value = "";
  }
}
const contact = reactive({ name: "", phone: "", email: "", comment: "" });

const submitting = ref(false);
const error = ref("");
const orderNumber = ref<string | null>(null);

const selectedDelivery = computed(() => findDelivery(delivery.method));
const delCost = computed(() =>
  effectiveDeliveryCost(delivery.method, goodsTotal.value, threshold.value),
); // null = уточнит менеджер
const grandTotal = computed(() => goodsTotal.value + (delCost.value ?? 0));

function onAddressSelect(s: { value: string; data: Record<string, any> }) {
  delivery.data = s.data;
}
function composeAddress() {
  const m = selectedDelivery.value;
  if (!m?.needsAddress) return "";
  const parts: string[] = [];
  if (m.type === "courier") {
    const svc = courierLabel(delivery.courierService);
    if (svc) parts.push(svc);
    parts.push(delivery.address);
    if (delivery.apartment) parts.push(`кв./офис ${delivery.apartment}`);
    if (delivery.entrance) parts.push(`подъезд ${delivery.entrance}`);
    if (delivery.floor) parts.push(`этаж ${delivery.floor}`);
    if (delivery.intercom) parts.push(`домофон ${delivery.intercom}`);
  } else if (m.type === "pvz") {
    const net = pvzLabel(delivery.pvzNetwork);
    if (net) parts.push(net);
    parts.push(delivery.address);
  } else {
    parts.push(delivery.address);
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
            courier_service: delivery.courierService || null,
            pvz_network: delivery.pvzNetwork || null,
            apartment: delivery.apartment || null,
            entrance: delivery.entrance || null,
            floor: delivery.floor || null,
            intercom: delivery.intercom || null,
          },
        },
        payment: { method: payment.method, requisitesFileId: payment.requisitesFileId },
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
        <div class="card-body flex flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-6">
          <!-- миниатюра превью: на мобайле широкая 3:2, на десктопе во всю высоту карточки -->
          <img
            v-if="it.thumb"
            :src="it.thumb"
            alt=""
            class="w-full aspect-[3/2] shrink-0 rounded-box border border-base-300 bg-base-100 object-contain p-2 sm:aspect-auto sm:h-auto sm:w-64 sm:self-stretch"
          />
          <div
            v-else
            class="grid w-full aspect-[3/2] shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 text-sm text-base-content/40 sm:aspect-auto sm:h-auto sm:w-64 sm:self-stretch"
          >
            нет превью
          </div>

          <!-- название + параметры таблицей -->
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <a :href="`/${it.slug}`" class="link link-hover text-2xl font-bold sm:text-3xl">{{ it.name }}</a>
            <table class="text-base">
              <tbody>
                <tr v-for="(d, i) in it.details" :key="i" class="align-top">
                  <td class="py-1 pr-5 text-base-content/55 whitespace-nowrap">{{ d.label }}</td>
                  <td class="py-1 font-medium">{{ d.value }}</td>
                </tr>
              </tbody>
            </table>
            <span v-if="it.artworkId" class="text-sm text-base-content/60">
              📎 макет
              <span v-if="it.preflight">· {{ it.preflight.status === "green" ? "🟢" : it.preflight.status === "yellow" ? "🟡" : "🔴" }}</span>
            </span>
          </div>

          <!-- цена + удалить: на мобайле — ряд снизу, на десктопе — колонка справа -->
          <div class="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-base-200 pt-3 sm:flex-col sm:items-end sm:justify-between sm:border-0 sm:pt-0">
            <div class="text-right">
              <div class="text-2xl font-bold leading-none sm:text-3xl">{{ money(it.total) }} ₽</div>
              <div class="mt-1.5 text-sm text-base-content/55">{{ it.unitPrice.toFixed(2) }} ₽/шт</div>
            </div>
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
          <span class="text-base font-semibold">Доставка</span>
          <!-- Прогресс до бесплатной доставки по Москве -->
          <div v-if="freeProgress.active" class="rounded-box bg-base-200 px-3 py-2 text-sm">
            <template v-if="freeProgress.qualified">
              🎉 Курьер по Москве — <span class="font-semibold">бесплатно</span> (заказ от {{ money(freeProgress.threshold) }} ₽)
            </template>
            <template v-else>
              До бесплатного курьера по Москве — ещё
              <span class="font-semibold">{{ money(freeProgress.remaining) }} ₽</span>
            </template>
          </div>
          <label v-for="m in DELIVERY_METHODS" :key="m.id" class="flex items-center gap-2">
            <input type="radio" class="radio radio-sm" :value="m.id" v-model="delivery.method" />
            <span>{{ m.label }}</span>
            <span class="text-sm text-base-content/60">
              {{ methodCostLabel(m) }}
              <template v-if="m.note">· {{ m.note }}</template>
            </span>
          </label>
          <!-- курьер: служба (по желанию) + адрес + детали дома -->
          <div v-if="selectedDelivery?.type === 'courier'" class="mt-1 flex flex-col gap-2">
            <select v-model="delivery.courierService" class="select select-sm w-full max-w-xs">
              <option value="">Служба — без предпочтения</option>
              <option v-for="c in COURIER_SERVICES" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <AddressField v-model="delivery.address" @select="onAddressSelect" />
            <div class="flex flex-wrap gap-2">
              <input v-model="delivery.apartment" class="input input-sm w-28" placeholder="Кв./офис" />
              <input v-model="delivery.entrance" class="input input-sm w-28" placeholder="Подъезд" />
              <input v-model="delivery.floor" class="input input-sm w-24" placeholder="Этаж" />
              <input v-model="delivery.intercom" class="input input-sm w-32" placeholder="Домофон" />
            </div>
          </div>

          <!-- ПВЗ/постамат: сеть + адрес пункта -->
          <div v-else-if="selectedDelivery?.type === 'pvz'" class="mt-1 flex flex-col gap-2">
            <select v-model="delivery.pvzNetwork" class="select select-sm w-full max-w-xs">
              <option v-for="n in PVZ_NETWORKS" :key="n.id" :value="n.id">{{ n.label }}</option>
            </select>
            <AddressField v-model="delivery.address" @select="onAddressSelect" placeholder="Адрес ПВЗ или постамата" />
            <span class="text-xs text-base-content/60">
              <template v-if="selectedPvzHint">
                {{ selectedPvzHint.label }}: {{ selectedPvzHint.price ?? "по тарифу перевозчика" }}, срок {{ selectedPvzHint.term }} (ориентировочно).
              </template>
              Укажите адрес пункта выдачи — точную стоимость подтвердит менеджер.
            </span>
          </div>
        </div>

        <!-- Оплата -->
        <div class="flex flex-col gap-2">
          <span class="text-base font-semibold">Оплата</span>
          <label v-for="m in PAYMENT_METHODS" :key="m.id" class="flex items-center gap-2"
                 :class="{ 'opacity-50': !m.available }">
            <input type="radio" class="radio radio-sm" :value="m.id" v-model="payment.method" :disabled="!m.available" />
            <span>{{ m.label }}</span>
            <span v-if="m.note" class="text-sm text-base-content/60">· {{ m.note }}</span>
          </label>

          <!-- реквизиты для счёта (юрлицо) -->
          <div v-if="payment.method === 'invoice'" class="mt-1 flex flex-col gap-1.5">
            <div v-if="payment.requisitesName" class="flex items-center gap-3 text-sm">
              <span>📎 {{ payment.requisitesName }}</span>
              <button type="button" class="btn btn-ghost btn-xs" @click="payment.requisitesFileId = null; payment.requisitesName = ''">убрать</button>
            </div>
            <template v-else>
              <input type="file" class="file-input file-input-sm w-full max-w-xs"
                     accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.rtf,.odt"
                     :disabled="reqStatus === 'uploading'" @change="onRequisitesChange" />
              <span v-if="reqStatus === 'uploading'" class="text-sm opacity-70">Загрузка…</span>
              <span v-if="reqStatus === 'error'" class="text-sm text-error">{{ reqError }}</span>
              <span class="text-xs text-base-content/60">Реквизиты для счёта (PDF/скан/Word/Excel). Можно прислать позже.</span>
            </template>
          </div>
        </div>

        <!-- Контакты -->
        <div class="flex flex-col gap-2">
          <span class="text-base font-semibold">Контакты</span>
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
            <span class="text-3xl font-bold">{{ money(grandTotal) }} ₽</span>
          </div>
          <button class="btn btn-primary btn-lg btn-block" :disabled="submitting" @click="submit">
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
