<script setup lang="ts">
// Селектор доставки: самовывоз (офис), наш курьер (промо с прогрессом до порога /
// «✓ бесплатно» после) + сетка плиток перевозчиков (крупное лого, название сверху,
// срок+цена снизу). Данные — из #delivery-methods (JSON, BaseLayout), порог — из меты.
// Выбор пишется в общий стор selectedDeliveryCode → подхватывается корзиной.
// Сворачивание ТОЛЬКО в мобильной плашке; на ПК и в корзине всегда развёрнут.
import { ref, computed, onMounted } from "vue";
import { useStore } from "@nanostores/vue";
import { selectedDeliveryCode, setDelivery } from "../stores/delivery";
import {
  FREE_DELIVERY_DEFAULT,
  freeDeliveryProgress,
  isSelectable,
  methodCost,
  type DeliveryMethod,
} from "../lib/delivery";
import { deliveryDayLabel } from "../lib/leadtime";

const props = defineProps<{
  goodsSubtotal: number; // сумма для порога и цены
  leadDays: number; // срок готовности товара (для дня доставки)
  startOpen?: boolean; // корзина: всегда развёрнут
}>();

const methods = ref<DeliveryMethod[]>([]);
const threshold = ref(FREE_DELIVERY_DEFAULT);
const cutoff = ref(14);
const now = ref(new Date());
// Сворачивание — ТОЛЬКО в мобильной плашке, управляется CSS (media query). На ПК и в
// корзине (startOpen) тело всегда видно. `open` — ручной тумблер мобильной плашки.
const open = ref(false);
const code = useStore(selectedDeliveryCode);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

onMounted(() => {
  try {
    const el = document.getElementById("delivery-methods");
    if (el?.textContent) methods.value = JSON.parse(el.textContent) as DeliveryMethod[];
  } catch {
    /* нет данных — компонент не покажет способы */
  }
  const th = document.querySelector('meta[name="free-delivery-threshold"]')?.getAttribute("content");
  if (th) threshold.value = Number(th) || FREE_DELIVERY_DEFAULT;
  const lc = document.querySelector('meta[name="lead-cutoff"]')?.getAttribute("content");
  if (lc) cutoff.value = Number(lc) || 14;
  // выбранного кода нет среди способов → первый (самовывоз)
  if (methods.value.length && !methods.value.some((m) => m.code === code.value)) {
    setDelivery(methods.value[0].code);
  }
});

const progress = computed(() => freeDeliveryProgress(props.goodsSubtotal, threshold.value));
// В витрине — только основной самовывоз (офис); вторую точку уточняют при оформлении.
const mainPickup = computed(() => methods.value.find((m) => m.type === "pickup"));
const ourCourier = computed(() => methods.value.find((m) => m.freeOverThreshold));
const tiles = computed(() =>
  methods.value.filter((m) => m.type !== "pickup" && !m.freeOverThreshold),
);
const selected = computed(() => methods.value.find((m) => m.code === code.value));
const fillPct = computed(() =>
  progress.value.threshold
    ? Math.min(100, ((progress.value.threshold - progress.value.remaining) / progress.value.threshold) * 100)
    : 0,
);

function dayLabel(m: DeliveryMethod): string {
  return deliveryDayLabel(now.value, props.leadDays, m.etaDays, cutoff.value);
}
function priceLabel(m: DeliveryMethod): string {
  const c = methodCost(m, props.goodsSubtotal, threshold.value);
  if (c === 0) return "бесплатно";
  if (m.priceFrom == null) return "уточнит менеджер";
  const pre = m.pricePrefix ? `${m.pricePrefix} ` : "";
  return `${pre}${money(m.priceFrom)} ₽`;
}
function canPick(m: DeliveryMethod): boolean {
  return isSelectable(m, props.goodsSubtotal, threshold.value);
}
function pick(m: DeliveryMethod) {
  if (canPick(m)) setDelivery(m.code);
}
</script>

<template>
  <div v-if="methods.length" class="ds" :class="{ 'ds--open': open || startOpen, 'ds--static': startOpen }">
    <!-- Заголовок-свёртка: активен только в мобильной плашке (на ПК/в корзине CSS
         делает его статичным и всегда показывает тело) -->
    <button type="button" class="ds__head" @click="open = !open" :aria-expanded="open">
      <span>Получение · Москва</span>
      <span class="ds__head-sel" v-if="selected">· {{ selected.label }}</span>
      <svg class="ds__chev" :class="{ 'ds__chev--open': open }" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div class="ds__body">
      <!-- Самовывоз (офис) -->
      <button v-if="mainPickup" type="button" class="ds__row"
        :class="{ 'ds__row--sel': mainPickup.code === code }" @click="pick(mainPickup)">
        <span class="ds__row-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l1-5h16l1 5M4 9h16v11H4zM9 13h6" />
          </svg>
        </span>
        <span class="ds__row-main">
          <span class="ds__row-label">{{ mainPickup.label }}</span>
          <span v-if="mainPickup.note" class="ds__row-note">{{ mainPickup.note }}</span>
        </span>
        <span class="ds__row-price ds__free">{{ dayLabel(mainPickup) }} · {{ priceLabel(mainPickup) }}</span>
      </button>

      <!-- Наш курьер: промо-блок с прогрессом (до порога) или выбираемая строка (после) -->
      <template v-if="ourCourier">
        <div v-if="!canPick(ourCourier)" class="ds__courier">
          <div class="ds__courier-head">
            <span class="ds__row-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </span>
            <span class="ds__courier-label">{{ ourCourier.label }}</span>
            <span class="ds__courier-price">бесплатно от {{ money(progress.threshold) }} ₽</span>
          </div>
          <span class="ds__promo-bar"><span class="ds__promo-fill" :style="{ width: fillPct + '%' }" /></span>
          <span class="ds__promo-hint">Добавьте ещё на {{ money(progress.remaining) }} ₽ — курьер бесплатно</span>
        </div>
        <button v-else type="button" class="ds__row" :class="{ 'ds__row--sel': ourCourier.code === code }" @click="pick(ourCourier)">
          <span class="ds__row-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </span>
          <span class="ds__row-main"><span class="ds__row-label">{{ ourCourier.label }}</span></span>
          <span class="ds__row-price ds__free">✓ {{ dayLabel(ourCourier) }} · бесплатно</span>
        </button>
      </template>

      <!-- Перевозчики: плитки (название сверху, крупное лого, срок+цена снизу) -->
      <div class="ds__grid">
        <button v-for="m in tiles" :key="m.code" type="button" class="ds__tile"
          :class="{ 'ds__tile--sel': m.code === code }" @click="pick(m)">
          <span class="ds__tile-label">{{ m.label }}</span>
          <span class="ds__tile-logo">
            <img v-if="m.logo" :src="m.logo" :alt="m.label" />
            <span v-else class="ds__tile-logo-ph" aria-hidden="true"></span>
          </span>
          <span class="ds__tile-meta">{{ dayLabel(m) }} · {{ priceLabel(m) }}</span>
        </button>
      </div>

      <p class="ds__foot">Адрес и точный расчёт — при оформлении</p>
    </div>
  </div>
</template>

<style scoped>
.ds { border-top: 1px solid var(--color-base-300); padding-top: 0.6rem; }
.ds__head {
  display: flex; align-items: center; gap: 0.4rem; width: 100%;
  background: none; border: 0; padding: 0.15rem 0; cursor: pointer;
  font-size: 0.9rem; color: color-mix(in oklch, var(--color-base-content) 70%, transparent);
}
.ds__head-sel { font-weight: 600; color: var(--color-base-content); }
.ds__chev { width: 1rem; height: 1rem; margin-left: auto; transition: transform 0.15s; }
.ds__chev--open { transform: rotate(180deg); }

/* Тело: свёрнуто по умолчанию (мобильная плашка), разворачивается по ds--open. */
.ds__body { display: none; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.ds--open .ds__body { display: flex; }

/* Статичный режим (корзина, startOpen): заголовок не кликается, тело всегда видно. */
.ds--static .ds__head { pointer-events: none; cursor: default; }
.ds--static .ds__chev,
.ds--static .ds__head-sel { display: none; }
.ds--static .ds__body { display: flex; }

/* ПК: тело всегда развёрнуто, заголовок статичный (свёртка — только мобильная плашка). */
@media (min-width: 768px) {
  .ds__body { display: flex; }
  .ds__head { pointer-events: none; cursor: default; }
  .ds__chev,
  .ds__head-sel { display: none; }
}

/* — Строки (самовывоз, выбранный курьер) — */
.ds__row {
  display: flex; align-items: center; gap: 0.6rem; width: 100%; text-align: left;
  padding: 0.55rem 0.7rem; border: 1.5px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.4rem); background: var(--color-base-100); cursor: pointer;
}
.ds__row--sel { border-color: var(--color-primary, #3b82f6); }
.ds__row-ico { flex: none; color: var(--color-base-content); opacity: 0.75; }
.ds__row-ico svg { width: 1.35rem; height: 1.35rem; }
.ds__row-main { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; flex: 1; }
.ds__row-label { font-weight: 600; font-size: 0.95rem; }
.ds__row-note { font-size: 0.72rem; line-height: 1.25; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.ds__row-price { flex: none; font-size: 0.85rem; color: color-mix(in oklch, var(--color-base-content) 70%, transparent); white-space: nowrap; }
.ds__free { color: #16a34a; font-weight: 600; }

/* — Курьер: промо-блок как в макете (шапка → прогресс → подпись) — */
.ds__courier {
  display: flex; flex-direction: column; gap: 0.45rem;
  padding: 0.6rem 0.7rem; border: 1.5px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.4rem); background: var(--color-base-100);
}
.ds__courier-head { display: flex; align-items: center; gap: 0.6rem; }
.ds__courier-label { font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
.ds__courier-price {
  margin-left: auto; flex: none; font-size: 0.85rem; white-space: nowrap;
  color: color-mix(in oklch, var(--color-base-content) 70%, transparent);
}
.ds__promo-bar { height: 5px; border-radius: 999px; background: var(--color-base-300); overflow: hidden; }
.ds__promo-fill { display: block; height: 100%; background: var(--color-primary, #3b82f6); }
.ds__promo-hint { font-size: 0.78rem; font-weight: 600; color: var(--color-primary, #3b82f6); }

/* — Плитки перевозчиков: 3 колонки × 2 ряда, квадратное лого — */
.ds__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
.ds__tile {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center;
  padding: 0.45rem 0.3rem; border: 1.5px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.4rem); background: var(--color-base-100); cursor: pointer;
}
.ds__tile--sel { border-color: var(--color-primary, #3b82f6); }
.ds__tile-label { max-width: 100%; font-weight: 600; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ds__tile-logo { display: flex; align-items: center; justify-content: center; height: 2.85rem; }
.ds__tile-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ds__tile-logo-ph { width: 2.85rem; height: 2.85rem; border-radius: 0.3rem; background: var(--color-base-200); }
.ds__tile-meta { font-size: 0.7rem; line-height: 1.25; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }

.ds__foot { margin: 0.1rem 0 0; font-size: 0.72rem; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
</style>
