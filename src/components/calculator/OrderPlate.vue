<script setup lang="ts">
// Плашка заказа: срок готовности + итог + «В корзину». Кладёт позицию (полная
// спецификация + снимок цены) в стор корзины. Серверный заказ — этап 2.
import { inject, ref, computed, onMounted, onUnmounted } from "vue";
import { useStore } from "@nanostores/vue";
import { sharedKey } from "../../composables/calcShared";
import { addToCart, cartTotal } from "../../stores/cart";
import { formatLead, msToNextLeadBoundary } from "../../lib/leadtime";
import DeliverySelect from "../DeliverySelect.vue";
import type { CartSpec } from "../../lib/pricing/spec";

const props = defineProps<{ name: string; slug: string }>();
// Общий контракт: плашка не зависит от стратегии (лист/многостраничная).
const calc = inject(sharedKey)!;
const added = ref(false);

// — Срок готовности (живой пересчёт: в отсечку/полночь обновляется сам) —
const now = ref(new Date());
const cutoff = ref(14);
let timer: ReturnType<typeof setTimeout> | undefined;
const tick = () => {
  now.value = new Date();
  timer = setTimeout(tick, msToNextLeadBoundary(now.value, cutoff.value));
};
// Сумма корзины — для порога/прогресса в селекторе доставки. mounted-гейт: селектор
// зависит от корзины (localStorage), которой нет на SSR — рендерим только на клиенте.
const cartSum = useStore(cartTotal);
const mounted = ref(false);
onMounted(() => {
  const meta = document.querySelector('meta[name="lead-cutoff"]')?.getAttribute("content");
  if (meta) cutoff.value = Number(meta) || 14;
  mounted.value = true;
  tick();
});
onUnmounted(() => timer && clearTimeout(timer));
const lead = computed(() =>
  formatLead(now.value, calc.product.leadDays ?? 2, cutoff.value),
);

// База для порога/прогресса: сумма корзины + текущий расчёт (как если бы добавили).
const deliveryBase = computed(() => cartSum.value + (calc.result?.total ?? 0));

function add() {
  if (!calc.result) return;
  addToCart({
    slug: props.slug,
    name: props.name,
    spec: { productSlug: props.slug, ...calc.currentSpec() } as CartSpec,
    details: calc.details(),
    thumb: calc.captureThumb(),
    qty: calc.totalQty,
    unitPrice: calc.result.total / calc.totalQty,
    total: calc.result.total,
    artworkId: calc.artworkId,
    preflight: calc.artworkPreflight,
  });
  added.value = true;
  setTimeout(() => (added.value = false), 2000);
}
</script>

<template>
  <!-- Плавающая корзина ПОВЕРХ контента: десктоп — карточка в правом нижнем
       углу (position: fixed); мобайл (<768) — нижняя панель над контакт-баром.
       Пустую (нет расчёта) не показываем. -->
  <aside class="plate" :class="{ 'plate--empty': !calc.result }">
    <div class="plate__inner">
      <template v-if="calc.result">
        <div class="plate__lead">
          <div class="plate__price-box">
            <div class="plate__price">{{ calc.money(calc.result.total) }} ₽</div>
            <div class="plate__sub">
              {{ (calc.result.total / calc.totalQty).toFixed(2) }} ₽/шт · {{ calc.totalQty }} шт
            </div>
          </div>

          <!-- Срок готовности — только на десктопе (на панели мобайла прячем) -->
          <div class="ready-plate" :title="lead.title">
            <svg class="ready-plate__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m9 0l3 2m-3-7v5" />
            </svg>
            <span>Готово {{ lead.text }}</span>
          </div>

          <button class="btn btn-primary plate__btn" :class="{ 'btn-success': added }" @click="add">
            {{ added ? "Добавлено ✓" : "В корзину" }}
          </button>
        </div>
        <p class="plate__note">Предварительный расчёт. Точная цена — после проверки макета.</p>
        <!-- Выбор доставки (свёрнут; выбор шарится с корзиной) — только клиент -->
        <DeliverySelect v-if="mounted" :goods-subtotal="deliveryBase" :lead-days="calc.product.leadDays ?? 2" />
        <!-- доп. действие (напр. «Получить ссылку») — только десктоп -->
        <div class="plate__extra"><slot name="extra" /></div>
      </template>
      <p v-else class="plate__empty">Заполните параметры для расчёта.</p>
    </div>
  </aside>
</template>

<style scoped>
/* Десктоп: плавающая карточка в правом нижнем углу ПОВЕРХ контента. */
.plate {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 30;
  width: min(22rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  border: 1px solid var(--color-base-content);
  border-radius: var(--radius-box, 1rem);
  background: var(--color-base-100);
  box-shadow: 0 10px 30px rgb(0 0 0 / 18%);
}
.plate--empty { display: none; } /* нет расчёта — корзину не показываем */
.plate__inner { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; }
.plate__lead { display: flex; flex-direction: column; gap: 0.75rem; }
.plate__price { font-size: 1.875rem; font-weight: 700; line-height: 1.1; }
.plate__sub { font-size: 0.875rem; color: var(--color-base-content); opacity: 0.6; }
.plate__btn { width: 100%; }
.plate__note { font-size: 0.75rem; color: var(--color-base-content); opacity: 0.6; }
.plate__empty { font-size: 0.875rem; color: var(--color-base-content); opacity: 0.6; }
.plate__extra:empty { display: none; }

.ready-plate {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-field, 0.25rem);
  background: var(--color-base-200);
  font-size: 0.9rem;
  font-weight: 600;
}
.ready-plate__icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* Мобайл: фиксированная нижняя панель (цена слева, кнопка справа).
   Идёт ПОСЛЕ базовых правил — иначе override display:none перекрывается. */
@media (max-width: 767px) {
  .plate {
    left: 0;
    right: 0;
    width: auto;
    /* селектор доставки может разворачиваться — ограничиваем высоту и скроллим */
    max-height: calc(100dvh - var(--mobile-bar-h, 5rem) - 1rem);
    overflow-y: auto;
    /* над глобальной контакт-панелью (.mobile-bar), а не поверх неё */
    bottom: var(--mobile-bar-h, 5rem);
    z-index: 40;
    border: 0;
    border-top: 1px solid var(--color-base-300);
    border-radius: 0;
    box-shadow: 0 -4px 16px rgb(0 0 0 / 10%);
  }
  .plate__inner { padding: 0.6rem 1rem; }
  .plate__lead { flex-direction: row; align-items: center; justify-content: space-between; gap: 1rem; }
  .plate__price { font-size: 1.4rem; }
  .plate__btn { width: auto; flex: none; }
  .ready-plate,
  .plate__note,
  .plate__extra { display: none; }
}
</style>
