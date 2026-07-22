<script setup lang="ts">
// Единая плитка выбора для ВСЕХ блоков калькулятора (размер, печать, материал,
// ламинация, фольга, фальцовка, переплёт): один размер и стиль. Миниатюра 16:9 —
// картинка (avif/webp), либо глиф-фолбэк, либо цвет-заливка (фольга без фото),
// либо слот #thumb (напр. SizeGlyph). Подпись + опциональная вторая строка.
import { onBeforeUnmount, ref } from "vue";
import type { ResponsiveImage } from "../../lib/directus";

const props = withDefaults(
  defineProps<{
    label: string;
    sub?: string;
    thumb?: ResponsiveImage;
    glyph?: string; // тело SVG (viewBox 0 0 24 24) для фолбэка
    fill?: string; // цвет-заливка миниатюры (фольга без фото)
    active?: boolean;
    disabled?: boolean;
    title?: string;
    icon?: boolean; // компактный вариант для рядов без фото: иконка слева, текст
                    // справа, активная — киноварью (без серой заливки-миниатюры)
    zoom?: boolean; // ТАЧ: миниатюра кликабельна — тап по фото шлёт zoom
                    // (lightbox — забота родителя), тап по остальной плитке —
                    // выбор. На десктопе клик по фото ТОЖЕ выбор (см. full).
    full?: ResponsiveImage; // ДЕСКТОП: крупное фото для ховер-превью — карточка
                            // через Teleport в body (fixed — не режется
                            // overflow-контейнерами вроде списка материалов).
    multi?: boolean; // независимый вкл/выкл (доп-обработка) вместо выбора
                     // одного из ряда: role=checkbox, а не radio.
  }>(),
  { active: false, disabled: false, icon: false, zoom: false, multi: false },
);
const emit = defineEmits<{ select: []; zoom: [] }>();

// Ховер есть — превью по наведению, клик всюду = выбор; тача — старое
// поведение (тап по фото = lightbox). SSR-safe: на сервере ховера «нет».
const canHover =
  typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

function thumbClick(e: MouseEvent) {
  if (!props.zoom || canHover) return; // десктоп: всплывает до плитки → select
  e.stopPropagation();
  emit("zoom");
}

// ── Ховер-превью: fixed-карточка рядом с плиткой (над ней, либо под — где
// больше места), центр по плитке с прижатием к краям вьюпорта. Задержка
// против мельтешения при проводке мыши по ряду; прячем при скролле (позиция
// становится неверной) и при уходе курсора. pointer-events: none — карточка
// не перехватывает ховер и не мигает. ─────────────────────────────────────
const PV_W = 26; // ширина карточки, rem (совпадает с width в стилях)
const pvStyle = ref<Record<string, string> | null>(null);
let pvTimer: ReturnType<typeof setTimeout> | undefined;
function hidePreview() {
  clearTimeout(pvTimer);
  if (pvStyle.value) {
    pvStyle.value = null;
    window.removeEventListener("scroll", hidePreview, true);
  }
}
function tileEnter(e: MouseEvent) {
  if (!props.full || !canHover || props.disabled) return;
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  clearTimeout(pvTimer);
  pvTimer = setTimeout(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const w = PV_W * rem;
    const gap = 0.4 * rem;
    const left = Math.min(
      Math.max(r.left + r.width / 2 - w / 2, gap),
      window.innerWidth - w - gap,
    );
    const style: Record<string, string> = { left: `${left}px` };
    if (r.top >= window.innerHeight - r.bottom)
      style.bottom = `${window.innerHeight - r.top + gap}px`;
    else style.top = `${r.bottom + gap}px`;
    pvStyle.value = style;
    window.addEventListener("scroll", hidePreview, true);
  }, 120);
}
onBeforeUnmount(hidePreview);

// Параллакс миниатюры: фото слегка увеличено и «плывёт» за курсором в пределах
// рамки. Смещение — CSS-переменные на элементе, transform считает CSS.
function thumbMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--px", `${(-x * 6).toFixed(2)}%`);
  el.style.setProperty("--py", `${(-y * 6).toFixed(2)}%`);
}
function thumbLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.removeProperty("--px");
  el.style.removeProperty("--py");
}
</script>

<template>
  <button
    type="button"
    :role="multi ? 'checkbox' : 'radio'"
    :aria-checked="active"
    :disabled="disabled"
    :title="title ?? label"
    class="otile"
    :class="{ 'otile--on': active, 'otile--off': disabled, 'otile--icon': icon }"
    @click="emit('select')"
    @mouseenter="tileEnter"
    @mouseleave="hidePreview"
  >
    <span
      class="otile__thumb"
      :class="{ 'otile__thumb--zoom': zoom }"
      :style="fill && !thumb ? `background:${fill}` : ''"
      :role="zoom ? 'button' : undefined"
      :tabindex="zoom ? 0 : undefined"
      :aria-label="zoom ? 'Увеличить фото' : undefined"
      @click="thumbClick"
      @keydown.enter="zoom && ($event.stopPropagation(), $event.preventDefault(), emit('zoom'))"
      @mousemove="zoom && thumbMove($event)"
      @mouseleave="zoom && thumbLeave($event)"
    >
      <slot name="thumb">
        <picture v-if="thumb">
          <source v-for="s in thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
          <img :src="thumb.src" :alt="label" class="otile__img" loading="lazy" decoding="async" fetchpriority="low" />
        </picture>
        <svg v-else-if="glyph" viewBox="0 0 24 24" aria-hidden="true" class="otile__glyph" v-html="glyph" />
      </slot>
      <!-- метка для тачей (ховера нет): некликабельный значок в углу -->
      <span v-if="zoom" class="otile__badge" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </span>
    </span>
    <span class="otile__text">
      <span class="otile__name">
        <!-- Галочка у выбранной плитки: подтверждает выбор словом, а не только
             рамкой (важно для снимаемых опций — видно, что это состояние). -->
        <svg
          v-if="active"
          class="otile__check"
          viewBox="0 0 24 24"
          aria-hidden="true"
        ><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        {{ label }}
      </span>
      <span v-if="sub" class="otile__sub">{{ sub }}</span>
    </span>
  </button>

  <!-- Ховер-превью (десктоп): fixed-карточка в body — Teleport выводит её из
       overflow-контейнеров (список материалов режет absolute-потомков).
       v-if на САМОМ Teleport: при SSR/гидрации его нет в дереве вовсе — иначе
       его якоря-комментарии ломаются об hydration-мисматчи страницы, и после
       первого же ре-рендера insertBefore падает на null (было на проде). -->
  <Teleport v-if="pvStyle && full" to="body">
    <div class="otile-preview" :style="pvStyle" aria-hidden="true">
      <picture>
        <source v-for="s in full.sources" :key="s.type" :type="s.type" :srcset="s.srcset" sizes="26rem" />
        <img :src="full.src" :alt="label" sizes="26rem" class="otile-preview__img" />
      </picture>
      <span class="otile-preview__cap">{{ label }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.otile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 9rem;
  padding: 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.otile:hover { border-color: var(--color-base-content, #555); }
/* Выбранная плитка: киноварная рамка + лёгкая киноварная подложка + галочка
   в подписи. Три признака вместо одного — выбор читается и на монохромной
   миниатюре, и при дальтонизме (галочка не зависит от цвета). */
.otile--on {
  border-color: var(--color-accent-ink);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: color-mix(in oklch, var(--color-accent-ink) 7%, var(--color-base-100, #fff));
}
.otile--on:hover { border-color: var(--color-accent-ink); }
.otile--on .otile__name { color: var(--color-accent-ink); font-weight: 600; }
.otile__check {
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
  margin-right: 0.15em;
  vertical-align: -0.08em;
  color: var(--color-accent-ink);
}
.otile--off { cursor: not-allowed; opacity: 0.4; }
.otile--off:hover { border-color: var(--color-base-300, #d6d3cd); }
.otile__thumb {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea); /* placeholder, пока грузится */
}
.otile__thumb picture { display: contents; }
.otile__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.otile__glyph { width: 2.2rem; height: 2.2rem; opacity: 0.45; }

/* ── Миниатюра с фото (zoom/full): десктоп — ховер-превью карточкой + лёгкий
   зум с параллаксом за курсором (--px/--py ставит JS), клик всюду = выбор.
   Тач — тап по фото открывает lightbox, в углу постоянный значок-метка. ── */
.otile__thumb--zoom .otile__img {
  transition: transform 0.25s ease;
  will-change: transform;
}
.otile__badge {
  display: none;
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--color-base-content, #555);
  border-radius: 9999px;
  background: var(--color-base-100, #fff);
  pointer-events: none;
}
@media (hover: hover) {
  .otile__thumb--zoom:hover .otile__img {
    transform: scale(1.12) translate(var(--px, 0%), var(--py, 0%));
  }
}
@media (hover: none) {
  .otile__thumb--zoom { cursor: zoom-in; }
  .otile__thumb--zoom .otile__badge { display: grid; }
}

/* ── Ховер-превью: карточка в body (Teleport), позицию (left/top|bottom)
   ставит JS от рамки плитки. Ширина = PV_W в скрипте — менять парой. ── */
.otile-preview {
  position: fixed;
  z-index: 60;
  width: 26rem;
  padding: 0.25rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: var(--radius-box, 0.75rem);
  background: var(--color-base-100, #fff);
  box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.18);
  pointer-events: none;
}
.otile-preview__img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 29rem;
  object-fit: contain;
  border-radius: calc(var(--radius-box, 0.75rem) - 0.25rem);
}
.otile-preview__cap {
  display: block;
  padding: 0.35rem 0.25rem 0.15rem;
  text-align: center;
  font-size: 0.8rem;
}
/* глиф/иконка, переданные через слот #thumb (напр. SizeGlyph) */
.otile__thumb :slotted(svg) { width: 2.2rem; height: 2.2rem; opacity: 0.45; }
.otile__text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}
.otile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.otile__sub { font-size: 0.65rem; line-height: 1; opacity: 0.55; white-space: nowrap; }

/* ── Вариант «icon»: ряды без фото (размер, стороны печати). Иконка слева,
   текст справа, плитка низкая; активная — киноварью, без серой заливки, чтобы
   иконка не сливалась с фоном выделения. ─────────────────────────────────── */
.otile--icon {
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;
  width: auto;
  min-width: 6rem;
  padding: 0.45rem 0.7rem;
}
.otile--icon .otile__thumb {
  width: auto;
  aspect-ratio: auto;
  flex: 0 0 auto;
  background: none; /* прозрачно — не сливается с выделением */
  border-radius: 0;
}
.otile--icon .otile__glyph,
.otile--icon .otile__thumb :slotted(svg) { width: 1.7rem; height: 1.7rem; opacity: 0.75; }
.otile--icon .otile__text { align-items: flex-start; gap: 0.1rem; }
.otile--icon .otile__name {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  -webkit-line-clamp: 1;
}
.otile--icon .otile__sub { line-height: 1.1; }
/* активная icon-плитка — киноварь: рамка + иконка + текст, без заливки */
.otile--icon.otile--on {
  border-color: var(--color-accent-ink);
  background: var(--color-base-100, #fff);
  color: var(--color-accent-ink);
  padding: calc(0.45rem - 1px) calc(0.7rem - 1px);
}
.otile--icon.otile--on:hover { border-color: var(--color-accent-ink); }
.otile--icon.otile--on .otile__sub { color: var(--color-accent-ink); opacity: 1; }
.otile--icon.otile--on .otile__glyph,
.otile--icon.otile--on .otile__thumb :slotted(svg) { opacity: 1; }
</style>
