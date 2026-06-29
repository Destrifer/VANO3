<script setup lang="ts">
// Поля конфигуратора многостраничной (брошюры). Состоит из ОБЩИХ презентационных
// компонентов (как визитки) + специфика: полосы и авто-переплёт, обложка/блок.
import { inject } from "vue";
import { mpCalcKey } from "../composables/useMultipageCalculator";
import SizePicker from "./calculator/SizePicker.vue";
import PaperSelect from "./calculator/PaperSelect.vue";
import SidesSelect from "./calculator/SidesSelect.vue";
import CoatingField from "./calculator/CoatingField.vue";
import QuantitySlider from "./calculator/QuantitySlider.vue";

const calc = inject(mpCalcKey)!;
const onRange = (e: Event) => calc.setPages(+(e.target as HTMLInputElement).value);
const onInput = (e: Event) => calc.setPages(+(e.target as HTMLInputElement).value);

// Глифы-фолбэки переплёта (Tabler, viewBox 0 0 24 24), пока нет иконки из
// Directus: пружина → spiral, скоба → paperclip, КБС/клей → notebook, иначе book.
const BIND_GLYPH: Record<string, string> = {
  spiral: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 12.057a1.9 1.9 0 0 0 .614.743c1.06.713 2.472.112 3.043-.919c.839-1.513-.022-3.368-1.525-4.08c-2-.95-4.371.154-5.24 2.086c-1.095 2.432.29 5.248 2.71 6.246c2.931 1.208 6.283-.418 7.438-3.255c1.36-3.343-.557-7.134-3.896-8.41c-3.855-1.474-8.2.68-9.636 4.422c-1.63 4.253.823 9.024 5.082 10.576c4.778 1.74 10.118-.941 11.833-5.59A9.4 9.4 0 0 0 21 11.063"/>',
  staple: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3L18 10a3 3 0 0 0-6-6l-6.5 6.5a4.5 4.5 0 0 0 9 9L21 13"/>',
  glue: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2"/>',
  book: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13"/>',
};
function bindGlyph(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("пруж") || n.includes("spiral")) return BIND_GLYPH.spiral;
  if (n.includes("скоб") || n.includes("скреп")) return BIND_GLYPH.staple;
  if (n.includes("кбс") || n.includes("клей") || n.includes("термо")) return BIND_GLYPH.glue;
  return BIND_GLYPH.book;
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Формат (ряд плиток-иконок; «свой» — поповер ввода) -->
    <SizePicker
      label="Формат"
      :tiles="calc.sizeTiles"
      :active-id="calc.activeTileId"
      :input="calc.sizeInput"
      v-model:customW="calc.customW"
      v-model:customH="calc.customH"
      :diameter="0"
      :min="50"
      :max="calc.maxDim"
      @select="calc.selectTile"
    >
      <template #hint>
        <span v-if="!calc.formatValid" class="text-xs text-error">
          Размер должен влезать на печатный лист (до {{ calc.maxDim }} мм по большей стороне).
        </span>
      </template>
    </SizePicker>

    <!-- Полосы: слайдер (×4) + степпер/ввод; переплёт подстраивается -->
    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold">Полос</span>
      <input
        type="range" :min="calc.pagesMin" :max="calc.pagesMax" step="4"
        :value="calc.pages" @input="onRange" class="range range-sm max-w-xs"
      />
      <div class="flex items-center gap-2">
        <div class="join">
          <button type="button" class="btn btn-sm join-item" @click="calc.decPages()">−</button>
          <input
            type="number" step="4" :min="calc.pagesMin" :max="calc.pagesMax"
            :value="calc.pages" @change="onInput"
            class="input input-sm join-item w-20 text-center"
          />
          <button type="button" class="btn btn-sm join-item" @click="calc.incPages()">+</button>
        </div>
        <span class="text-xs opacity-60">кратно 4, {{ calc.pagesMin }}–{{ calc.pagesMax }}</span>
      </div>
    </div>

    <!-- Переплёт: авто по числу полос, несовместимые недоступны -->
    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold">Переплёт</span>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Переплёт">
        <button
          v-for="(b, i) in calc.product.bindings"
          :key="i"
          type="button"
          role="radio"
          :aria-checked="calc.bindingIndex === i"
          :disabled="!calc.bindingCompatible(b)"
          :title="calc.bindingCompatible(b) ? b.name : `${b.name} — ${b.minPages}–${b.maxPages} полос`"
          class="bind-tile"
          :class="{ 'bind-tile--on': calc.bindingIndex === i, 'bind-tile--off': !calc.bindingCompatible(b) }"
          @click="calc.bindingCompatible(b) && (calc.bindingIndex = i)"
        >
          <span class="bind-tile__thumb">
            <picture v-if="b.thumb">
              <source v-for="s in b.thumb.sources" :key="s.type" :type="s.type" :srcset="s.srcset" />
              <img :src="b.thumb.src" :alt="b.name" class="bind-tile__img" loading="lazy" decoding="async" fetchpriority="low" />
            </picture>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="bind-tile__glyph" v-html="bindGlyph(b.name)" />
          </span>
          <span class="bind-tile__name">{{ b.name }}</span>
          <span class="bind-tile__sub">{{ b.minPages }}–{{ b.maxPages }} полос</span>
        </button>
      </div>
      <span class="text-xs opacity-60">подбирается автоматически по числу полос</span>
    </div>

    <!-- Обложка: бумага + печать + покрытие -->
    <div class="flex flex-col gap-4 rounded-box border border-base-300 p-3">
      <span class="text-sm font-bold opacity-70">Обложка</span>
      <PaperSelect
        label="Бумага обложки"
        :groups="calc.coverGroups"
        v-model:index="calc.coverPaperIndex"
        :colors="calc.coverColors"
        v-model:colorIndex="calc.coverColorIndex"
      />
      <SidesSelect label="Печать обложки" v-model="calc.coverSides" />
      <CoatingField
        :lamination-options="calc.laminationOptions"
        v-model:laminationIndex="calc.laminationIndex"
        :lamination-locked="calc.laminationLocked"
        :foil-option="calc.foilOption"
        v-model:foilOn="calc.foilOn"
        v-model:foilColorIndex="calc.foilColorIndex"
      />
    </div>

    <!-- Блок: бумага (всегда белая) + печать всегда двусторонняя -->
    <div class="flex flex-col gap-4 rounded-box border border-base-300 p-3">
      <span class="text-sm font-bold opacity-70">Блок</span>
      <PaperSelect
        label="Бумага блока"
        :groups="calc.innerGroups"
        v-model:index="calc.innerPaperIndex"
        :colors="[]"
        :color-index="0"
      />
      <span class="text-xs opacity-60">Печать блока — двусторонняя (4+4).</span>
    </div>

    <!-- Тираж -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm font-semibold">Тираж</span>
        <span class="text-sm" v-if="calc.perUnit(calc.quantity) != null">
          <span class="opacity-70">{{ calc.perUnit(calc.quantity)?.toFixed(2) }} ₽/шт</span>
          <span class="font-bold" v-if="calc.result"> · {{ calc.money(calc.result.total) }} ₽</span>
        </span>
      </div>
      <QuantitySlider :presets="calc.presets" v-model="calc.quantity" />
    </div>

  </div>
</template>

<style scoped>
/* Плитки переплёта — единый вид с остальными (.coat-tile/.fold-tile).
   Несовместимые (по числу полос) — приглушены и некликабельны. */
.bind-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 6.5rem;
  padding: 0.4rem;
  border: 1px solid var(--color-base-300, #d6d3cd);
  border-radius: 0.75rem;
  background: var(--color-base-100, #fff);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.bind-tile:hover { border-color: var(--color-base-content, #555); }
.bind-tile--on {
  border-color: var(--color-primary, #1f1f1f);
  border-width: 2px;
  padding: calc(0.4rem - 1px);
  background: var(--color-base-200, #f3f1ea);
}
.bind-tile--off { cursor: not-allowed; opacity: 0.4; }
.bind-tile--off:hover { border-color: var(--color-base-300, #d6d3cd); }
.bind-tile__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: 0.5rem;
  background-color: var(--color-base-200, #f3f1ea);
}
.bind-tile__thumb picture { display: contents; }
.bind-tile__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bind-tile__glyph { width: 1.7rem; height: 1.7rem; opacity: 0.4; }
.bind-tile__name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bind-tile__sub { font-size: 0.65rem; line-height: 1; opacity: 0.55; white-space: nowrap; }
</style>
