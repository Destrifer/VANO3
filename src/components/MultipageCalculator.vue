<script setup lang="ts">
// Поля конфигуратора многостраничной (брошюры). Состоит из ОБЩИХ презентационных
// компонентов (как визитки) + специфика: полосы и авто-переплёт, обложка/блок.
import { inject } from "vue";
import { mpCalcKey } from "../composables/useMultipageCalculator";
import FormatField from "./calculator/FormatField.vue";
import PaperSelect from "./calculator/PaperSelect.vue";
import SidesSelect from "./calculator/SidesSelect.vue";
import CoatingField from "./calculator/CoatingField.vue";
import QuantitySelect from "./calculator/QuantitySelect.vue";
import ArtworkUpload from "./calculator/ArtworkUpload.vue";

const calc = inject(mpCalcKey)!;
const onRange = (e: Event) => calc.setPages(+(e.target as HTMLInputElement).value);
const onInput = (e: Event) => calc.setPages(+(e.target as HTMLInputElement).value);
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Формат (свой размер на месте, без сдвига) -->
    <FormatField
      label="Формат"
      :sizes="calc.product.sizes"
      :allow-custom="true"
      v-model:index="calc.formatIndex"
      :custom-mode="calc.customMode"
      v-model:customW="calc.customW"
      v-model:customH="calc.customH"
      :min="50"
      :max="calc.maxDim"
      @back="calc.backToList"
    >
      <template #hint>
        <span v-if="!calc.formatValid" class="text-xs text-error">
          Размер должен влезать на печатный лист (до {{ calc.maxDim }} мм по большей стороне).
        </span>
      </template>
    </FormatField>

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
      <select v-model.number="calc.bindingIndex" class="select max-w-xs">
        <option
          v-for="(b, i) in calc.product.bindings" :key="i" :value="i"
          :disabled="!calc.bindingCompatible(b)"
        >
          {{ b.name }}<template v-if="!calc.bindingCompatible(b)"> — {{ b.minPages }}–{{ b.maxPages }} полос</template>
        </option>
      </select>
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
      <span class="text-sm font-semibold">Тираж</span>
      <QuantitySelect :presets="calc.presets" v-model="calc.quantity" :per-unit="calc.perUnit" />
    </div>

    <ArtworkUpload />
  </div>
</template>
