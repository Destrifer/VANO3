<script setup lang="ts">
// Единая плитка выбора для ВСЕХ блоков калькулятора (размер, печать, материал,
// ламинация, фольга, фальцовка, переплёт): один размер и стиль. Миниатюра 16:9 —
// картинка (avif/webp), либо глиф-фолбэк, либо цвет-заливка (фольга без фото),
// либо слот #thumb (напр. SizeGlyph). Подпись + опциональная вторая строка.
import type { ResponsiveImage } from "../../lib/directus";

withDefaults(
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
    zoom?: boolean; // миниатюра кликабельна: клик по фото шлёт zoom (lightbox —
                    // забота родителя), клик по остальной плитке — выбор. На
                    // ховере — затенение, подпись «Увеличить» и параллакс-зум.
  }>(),
  { active: false, disabled: false, icon: false, zoom: false },
);
const emit = defineEmits<{ select: []; zoom: [] }>();

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
    role="radio"
    :aria-checked="active"
    :disabled="disabled"
    :title="title ?? label"
    class="otile"
    :class="{ 'otile--on': active, 'otile--off': disabled, 'otile--icon': icon }"
    @click="emit('select')"
  >
    <span
      class="otile__thumb"
      :class="{ 'otile__thumb--zoom': zoom }"
      :style="fill && !thumb ? `background:${fill}` : ''"
      :role="zoom ? 'button' : undefined"
      :tabindex="zoom ? 0 : undefined"
      :aria-label="zoom ? 'Увеличить фото' : undefined"
      @click="zoom && ($event.stopPropagation(), emit('zoom'))"
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
      <!-- ховер-подсказка (десктоп): затенение + «Увеличить» -->
      <span v-if="zoom" class="otile__hint" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        Увеличить
      </span>
      <!-- метка для тачей (ховера нет): некликабельный значок в углу -->
      <span v-if="zoom" class="otile__badge" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </span>
    </span>
    <span class="otile__text">
      <span class="otile__name">{{ label }}</span>
      <span v-if="sub" class="otile__sub">{{ sub }}</span>
    </span>
  </button>
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
.otile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
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

/* ── Кликабельная миниатюра (zoom): клик по фото — lightbox, по плитке — выбор.
   Ховер: лёгкий зум + параллакс за курсором (--px/--py ставит JS), затенение
   и подпись «Увеличить». На тачах ховера нет — постоянный значок-метка. ── */
.otile__thumb--zoom { cursor: zoom-in; }
.otile__thumb--zoom .otile__img {
  transition: transform 0.25s ease;
  will-change: transform;
}
.otile__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
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
  .otile__thumb--zoom:hover .otile__hint,
  .otile__thumb--zoom:focus-visible .otile__hint { opacity: 1; }
}
@media (hover: none) {
  .otile__thumb--zoom .otile__badge { display: grid; }
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
