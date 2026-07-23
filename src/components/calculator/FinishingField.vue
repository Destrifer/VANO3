<script setup lang="ts">
// Постпечать: общий CoatingField (ламинация+фольга) + универсальные группы
// доп-обработки плитками (скругление/сверление/еврослот — варианты с картинками,
// как цвета фольги) + опции без group отдельным рядом плиток.
//
// Во всех рядах услуга включается выбором плитки и выключается повторным
// кликом по ней же — плиток «Без …» нет. Отсюда role=group + multi вместо
// radiogroup: у radio-группы нет состояния «ничего не выбрано».
import { inject, ref } from "vue";
import { calcKey } from "../../composables/useCalculator";
import CoatingField from "./CoatingField.vue";
import OptionTile from "./OptionTile.vue";
import ImageLightbox from "./ImageLightbox.vue";
import InfoTip from "../InfoTip.vue";
import { optionInfo } from "../../lib/optionInfo";
import { extraGlyph, groupGlyph } from "../../lib/calculator/finishingGlyph";

const calc = inject(calcKey)!;
const lightbox = ref<InstanceType<typeof ImageLightbox> | null>(null);
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
    <!-- Плитки «Без …» нет: услуга включается выбором варианта и выключается
         повторным кликом по нему же (снятие выбора). Поэтому role=group +
         multi, а не radiogroup: у radio нет состояния «ничего не выбрано». -->
    <div class="flex flex-wrap gap-2" role="group" :aria-label="g.heading">
      <OptionTile
        v-for="(v, i) in g.variants"
        :key="i"
        multi
        :label="v.name"
        :thumb="v.thumb"
        :glyph="groupGlyph(g.heading)"
        :active="calc.finGroupIndex[g.id] === i"
        :title="`${g.heading} — ${v.name}`"
        :zoom="!!v.full"
        :full="v.full"
        @select="calc.finGroupIndex[g.id] = calc.finGroupIndex[g.id] === i ? -1 : i"
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
