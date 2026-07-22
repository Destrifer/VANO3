<script setup lang="ts">
// Постпечать: общий CoatingField (ламинация+фольга) + универсальные группы
// доп-обработки плитками (скругление/сверление/еврослот — варианты с картинками,
// как цвета фольги) + остаток «Дополнительной обработки» чекбоксами (опции без
// group, если такие ещё есть у продукта).
import { inject, ref } from "vue";
import { calcKey } from "../../composables/useCalculator";
import CoatingField from "./CoatingField.vue";
import OptionTile from "./OptionTile.vue";
import ImageLightbox from "./ImageLightbox.vue";
import InfoTip from "../InfoTip.vue";
import { optionInfo } from "../../lib/optionInfo";
import { extraGlyph } from "../../lib/calculator/finishingGlyph";

const calc = inject(calcKey)!;
const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);

// Подпись плитки «без варианта» по названию группы (родительный падеж).
const NONE_LABEL: Record<string, string> = {
  "Скругление углов": "Без скругления",
  "Сверление отверстий": "Без отверстий",
  "Еврослот": "Без еврослота",
  "УФ-лак": "Без лака",
  "Конгрев": "Без конгрева",
  "Объёмный 3D-лак": "Без 3D-лака",
};
const noneLabel = (h: string) => NONE_LABEL[h] ?? "Без обработки";

// Глифы-фолбэки (viewBox 0 0 24 24), пока владелец не загрузил фото вариантов.
const GLYPH_NONE =
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.042 16.045A9 9 0 0 0 7.955 3.958M5.637 5.635a9 9 0 1 0 12.725 12.73M3 3l18 18"/>';
const GROUP_GLYPH: Record<string, string> = {
  "Скругление углов":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20v-6a10 10 0 0 1 10-10h6"/>',
  "Сверление отверстий":
    '<rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  "Еврослот":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5a2.6 2.6 0 0 0-2.6 2.6c0 1.3.9 1.9.9 3.1V16a1.7 1.7 0 0 0 3.4 0v-5.3c0-1.2.9-1.8.9-3.1A2.6 2.6 0 0 0 12 5z"/>',
  "УФ-лак":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c3 4.2 5 6.6 5 9.2a5 5 0 0 1-10 0C7 9.6 9 7.2 12 3z"/>',
  "Конгрев":
    '<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  "Объёмный 3D-лак":
    '<circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.4" d="M9.5 12.2a3.2 3.2 0 0 1 2.5-1.4"/>',
};
const groupGlyph = (h: string) => GROUP_GLYPH[h];
</script>

<template>
  <CoatingField
    :lamination-options="calc.laminationOptions"
    v-model:laminationIndex="calc.laminationIndex"
    :lamination-locked="calc.laminationLocked"
    :foil-option="calc.foilOption"
    v-model:foilOn="calc.foilOn"
    v-model:foilColorIndex="calc.foilColorIndex"
  />

  <!-- Универсальные группы доп-обработки плитками (скругление/сверление/еврослот) -->
  <div v-for="g in calc.variantGroups" :key="g.id" class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">
      {{ g.heading }}
      <InfoTip v-if="optionInfo(g.heading)" :text="optionInfo(g.heading)!" />
    </span>
    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="g.heading">
      <OptionTile
        :label="noneLabel(g.heading)"
        :thumb="g.thumb"
        :glyph="GLYPH_NONE"
        :active="(calc.finGroupIndex[g.id] ?? -1) === -1"
        :zoom="!!g.full"
        :full="g.full"
        @select="calc.finGroupIndex[g.id] = -1"
        @zoom="lightbox?.open(noneLabel(g.heading), g.full ?? null)"
      />
      <OptionTile
        v-for="(v, i) in g.variants"
        :key="i"
        :label="v.name"
        :thumb="v.thumb"
        :glyph="groupGlyph(g.heading)"
        :active="calc.finGroupIndex[g.id] === i"
        :title="`${g.heading} — ${v.name}`"
        :zoom="!!v.full"
        :full="v.full"
        @select="calc.finGroupIndex[g.id] = i"
        @zoom="lightbox?.open(v.name, v.full ?? null)"
      />
    </div>
  </div>

  <!-- Опции без group (у них нет вариантов-картинок в finishing_colors) —
       тоже плитками, но независимыми: не «один из ряда», а вкл/выкл каждая
       (role=checkbox через multi). Картинка — image самой опции; нет фото →
       глиф по имени (EXTRA_GLYPH). -->
  <div class="flex flex-col gap-1.5" v-if="calc.otherOptions.length">
    <span class="text-sm font-semibold">Дополнительная обработка</span>
    <div class="flex flex-wrap gap-2" role="group" aria-label="Дополнительная обработка">
      <OptionTile
        v-for="{ o, i } in calc.otherOptions"
        :key="i"
        multi
        :label="o.name"
        :thumb="o.thumb"
        :glyph="extraGlyph(o.name)"
        :zoom="!!o.full"
        :full="o.full"
        :active="calc.fin[i].checked"
        :title="o.name"
        @select="calc.fin[i].checked = !calc.fin[i].checked"
        @zoom="lightbox?.open(o.name, o.full ?? null)"
      />
    </div>
    <!-- Количество — только у опций, где цена зависит от него (сгибы/отверстия) -->
    <label
      v-for="{ o, i } in calc.otherOptions.filter(
        ({ o, i }) => calc.fin[i].checked && calc.needsCount(o.unit),
      )"
      :key="`c${i}`"
      class="inline-flex items-center gap-2 text-sm"
    >
      <span class="opacity-70">{{ o.name }}:</span>
      <input
        type="number" class="input input-xs w-20"
        v-model.number="calc.fin[i].count" min="1"
        :title="calc.countLabel[o.unit]"
      />
      <span class="opacity-70">{{ calc.countLabel[o.unit] }}</span>
    </label>
  </div>

  <ImageLightbox ref="lightbox" />
</template>
