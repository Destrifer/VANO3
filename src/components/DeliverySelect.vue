<script setup lang="ts">
// Селектор доставки: свёрнутый «Получение · Москва ⌄» → строки (самовывоз, наш
// курьер с прогрессом/бесплатно) + сетка плиток перевозчиков (лого + день + цена).
// Данные — из #delivery-methods (JSON, BaseLayout), порог — из меты. Выбор пишется
// в общий стор selectedDeliveryCode → подхватывается корзиной. Один компонент и в
// плашке товара, и в корзине.
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
  goodsSubtotal: number; // сумма для порога и цены (корзина / корзина+текущий расчёт)
  leadDays: number; // срок готовности товара (для дня доставки)
  startOpen?: boolean;
}>();

const methods = ref<DeliveryMethod[]>([]);
const threshold = ref(FREE_DELIVERY_DEFAULT);
const cutoff = ref(14);
const now = ref(new Date());
const open = ref(props.startOpen ?? false);
const code = useStore(selectedDeliveryCode);
const money = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

onMounted(() => {
  try {
    const el = document.getElementById("delivery-methods");
    if (el?.textContent) methods.value = JSON.parse(el.textContent) as DeliveryMethod[];
  } catch {
    /* нет данных — компонент просто не покажет способы */
  }
  const th = document.querySelector('meta[name="free-delivery-threshold"]')?.getAttribute("content");
  if (th) threshold.value = Number(th) || FREE_DELIVERY_DEFAULT;
  const lc = document.querySelector('meta[name="lead-cutoff"]')?.getAttribute("content");
  if (lc) cutoff.value = Number(lc) || 14;
  // выбранного кода нет среди способов (первая сессия/удалён) → первый способ
  if (methods.value.length && !methods.value.some((m) => m.code === code.value)) {
    setDelivery(methods.value[0].code);
  }
});

const progress = computed(() => freeDeliveryProgress(props.goodsSubtotal, threshold.value));
const pickups = computed(() => methods.value.filter((m) => m.type === "pickup"));
const ourCourier = computed(() => methods.value.find((m) => m.freeOverThreshold));
const tiles = computed(() =>
  methods.value.filter((m) => m.type !== "pickup" && !m.freeOverThreshold),
);
const selected = computed(() => methods.value.find((m) => m.code === code.value));

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
  <div v-if="methods.length" class="ds">
    <button type="button" class="ds__head" @click="open = !open" :aria-expanded="open">
      <span class="ds__head-label">Получение · Москва</span>
      <span class="ds__head-sel" v-if="selected">· {{ selected.label }}</span>
      <svg class="ds__chev" :class="{ 'ds__chev--open': open }" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div v-show="open" class="ds__body">
      <!-- Самовывоз (строки) -->
      <button v-for="m in pickups" :key="m.code" type="button" class="ds__row"
        :class="{ 'ds__row--sel': m.code === code }" @click="pick(m)">
        <span class="ds__row-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l1-5h16l1 5M4 9h16v11H4zM9 13h6" />
          </svg>
        </span>
        <span class="ds__row-main">
          <span class="ds__row-label">{{ m.label }}</span>
          <span v-if="m.note" class="ds__row-note">{{ m.note }}</span>
        </span>
        <span class="ds__row-price ds__free">{{ dayLabel(m) }} · {{ priceLabel(m) }}</span>
      </button>

      <!-- Наш курьер: промо-строка с прогрессом (порог не набран) или выбираемая (набран) -->
      <template v-if="ourCourier">
        <div v-if="!canPick(ourCourier)" class="ds__row ds__row--promo">
          <span class="ds__row-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </span>
          <span class="ds__row-main">
            <span class="ds__row-label">{{ ourCourier.label }}</span>
            <span class="ds__promo-bar"><span class="ds__promo-fill"
              :style="{ width: Math.min(100, (progress.threshold ? (progress.threshold - progress.remaining) / progress.threshold : 0) * 100) + '%' }" /></span>
            <span class="ds__promo-hint">Добавьте ещё на {{ money(progress.remaining) }} ₽ — курьер бесплатно</span>
          </span>
          <span class="ds__row-price">бесплатно от {{ money(progress.threshold) }} ₽</span>
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

      <!-- Перевозчики: плитки -->
      <div class="ds__grid">
        <button v-for="m in tiles" :key="m.code" type="button" class="ds__tile"
          :class="{ 'ds__tile--sel': m.code === code }" @click="pick(m)">
          <span class="ds__tile-top">
            <img v-if="m.logo" :src="m.logo" alt="" class="ds__logo" />
            <span v-else class="ds__logo ds__logo--ph" aria-hidden="true"></span>
            <span class="ds__tile-label">{{ m.label }}</span>
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
.ds__body { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }

.ds__row {
  display: flex; align-items: center; gap: 0.6rem; width: 100%; text-align: left;
  padding: 0.55rem 0.7rem; border: 1.5px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.4rem); background: var(--color-base-100); cursor: pointer;
}
.ds__row--sel { border-color: var(--color-primary, #3b82f6); }
.ds__row--promo { cursor: default; align-items: flex-start; }
.ds__row-ico { flex: none; color: var(--color-base-content); opacity: 0.75; }
.ds__row-ico svg { width: 1.35rem; height: 1.35rem; }
.ds__row-main { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; flex: 1; }
.ds__row-label { font-weight: 600; font-size: 0.95rem; }
.ds__row-note { font-size: 0.72rem; line-height: 1.25; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.ds__row-price { flex: none; font-size: 0.85rem; color: color-mix(in oklch, var(--color-base-content) 70%, transparent); white-space: nowrap; }
.ds__free { color: #16a34a; font-weight: 600; }

.ds__promo-bar { height: 4px; border-radius: 999px; background: var(--color-base-300); overflow: hidden; }
.ds__promo-fill { display: block; height: 100%; background: var(--color-primary, #3b82f6); }
.ds__promo-hint { font-size: 0.75rem; font-weight: 600; color: var(--color-primary, #3b82f6); }

.ds__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.ds__tile {
  display: flex; flex-direction: column; gap: 0.35rem; text-align: left;
  padding: 0.55rem 0.65rem; border: 1.5px solid var(--color-base-300);
  border-radius: var(--radius-field, 0.4rem); background: var(--color-base-100); cursor: pointer;
}
.ds__tile--sel { border-color: var(--color-primary, #3b82f6); }
.ds__tile-top { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.ds__logo { width: 1.15rem; height: 1.15rem; object-fit: contain; border-radius: 0.25rem; flex: none; }
.ds__logo--ph { background: var(--color-base-300); }
.ds__tile-label { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ds__tile-meta { font-size: 0.78rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }

.ds__foot { margin: 0.1rem 0 0; font-size: 0.72rem; color: color-mix(in oklch, var(--color-base-content) 55%, transparent); }
</style>
