<script setup lang="ts">
// Поля конфигуратора многостраничной (брошюры). Состоит из ОБЩИХ презентационных
// компонентов (как визитки) + специфика: полосы и авто-переплёт, обложка/блок.
import { inject } from "vue";
import { mpCalcKey } from "../composables/useMultipageCalculator";
import SizePicker from "./calculator/SizePicker.vue";
import PaperSelect from "./calculator/PaperSelect.vue";
import SidesSelect from "./calculator/SidesSelect.vue";
import CoatingField from "./calculator/CoatingField.vue";
import QuantitySelect from "./calculator/QuantitySelect.vue";
import OptionTile from "./calculator/OptionTile.vue";
import ImageLightbox from "./calculator/ImageLightbox.vue";
import { extraGlyph } from "../lib/calculator/finishingGlyph";
import { ref } from "vue";

const calc = inject(mpCalcKey)!;
// Lightbox фото разлиновки — паттерн PaperSelect/CoatingField: тап по фото на
// таче открывает крупное, на десктопе ховер-превью делает сама OptionTile.
const rulingLightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
// То же для фото переплёта (bindings.image) и доп-обработки обложки.
const bindLightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
const extraLightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
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

// Глифы разлиновки: рамка листа + собственно линовка внутри. Подбираются по
// названию из Directus (`ruling_options`), как и переплёт, — список правится
// в админке без правки кода; незнакомое имя → чистый лист.
const SHEET_FRAME =
  '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>';
const RULE_GLYPH: Record<string, string> = {
  blank: SHEET_FRAME,
  lines:
    SHEET_FRAME +
    '<path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M7 8h10M7 12h10M7 16h10"/>',
  grid:
    SHEET_FRAME +
    '<path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M7 9h10M7 13h10M7 17h10M10 6v13M14 6v13"/>',
  dots:
    SHEET_FRAME +
    '<g fill="currentColor"><circle cx="8.5" cy="9" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="15.5" cy="9" r="1"/><circle cx="8.5" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="15.5" cy="13" r="1"/><circle cx="8.5" cy="17" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="15.5" cy="17" r="1"/></g>',
};
function ruleGlyph(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("линей") || n.includes("лине")) return RULE_GLYPH.lines;
  if (n.includes("клет")) return RULE_GLYPH.grid;
  if (n.includes("точк") || n.includes("dot")) return RULE_GLYPH.dots;
  return RULE_GLYPH.blank;
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

    <!-- Тираж (один из основных параметров — сразу после формата) -->
    <div class="flex flex-col gap-2">
      <span class="text-sm font-semibold">Тираж</span>
      <QuantitySelect
        :presets="calc.presets"
        v-model="calc.quantity"
        :per-unit="calc.perUnit"
        :total="calc.result?.total ?? null"
        :total-qty="calc.totalQty"
        :money="calc.money"
      />
    </div>

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
        <OptionTile
          v-for="(b, i) in calc.product.bindings"
          :key="i"
          :label="b.name"
          :sub="`${b.minPages}–${b.maxPages} полос`"
          :thumb="b.thumb"
          :glyph="bindGlyph(b.name)"
          :zoom="!!b.full"
          :full="b.full"
          :active="calc.bindingIndex === i"
          :disabled="!calc.bindingCompatible(b)"
          :title="calc.bindingCompatible(b) ? b.name : `${b.name} — ${b.minPages}–${b.maxPages} полос`"
          @select="calc.bindingCompatible(b) && (calc.bindingIndex = i)"
          @zoom="bindLightbox?.open(b.name, b.full ?? null)"
        />
      </div>
      <span class="text-xs opacity-60">подбирается автоматически по числу полос</span>
      <ImageLightbox ref="bindLightbox" />
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
      <!-- Доп. обработка обложки: ungrouped-опции (УФ-лак, конгрев, объёмный
           лак). Плитки-переключатели, как в листовом FinishingField: опции
           независимые → multi (role=checkbox), картинка из finishing_options.image. -->
      <div v-if="calc.coverExtras.length" class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Дополнительная обработка</span>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Дополнительная обработка обложки">
          <OptionTile
            v-for="(o, i) in calc.coverExtras"
            :key="o.id"
            multi
            :label="o.name"
            :thumb="o.thumb"
            :glyph="extraGlyph(o.name)"
            :zoom="!!o.full"
            :full="o.full"
            :active="calc.extraChecked[i]"
            :title="o.name"
            @select="calc.extraChecked[i] = !calc.extraChecked[i]"
            @zoom="extraLightbox?.open(o.name, o.full ?? null)"
          />
        </div>
        <ImageLightbox ref="extraLightbox" />
      </div>
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
      <!-- Разлиновка: есть только у продуктов с `ruling_options` (блокноты).
           На цену не влияет — печатается тем же 4+4, что и блок. -->
      <div v-if="calc.hasRuling" class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Разлиновка</span>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Разлиновка блока">
          <OptionTile
            v-for="(r, i) in calc.rulingOptions"
            :key="r.name"
            :label="r.name"
            :thumb="r.thumb"
            :glyph="ruleGlyph(r.name)"
            :zoom="!!r.full"
            :full="r.full"
            :active="calc.rulingIndex === i"
            @select="calc.selectRuling(i)"
            @zoom="rulingLightbox?.open(r.name, r.full ?? null)"
          />
        </div>
        <span class="text-xs opacity-60">на цену не влияет</span>
        <ImageLightbox ref="rulingLightbox" />
      </div>
      <span class="text-xs opacity-60">Печать блока — двусторонняя (4+4).</span>
    </div>

  </div>
</template>
