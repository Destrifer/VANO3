<script setup lang="ts">
// Тираж слайдером с «прилипанием» к пресетам: дискретный range по индексам
// пресетов (шаг 1 → ручка встаёт только на метки). Пузырёк показывает текущий
// тираж, метки кликабельны. Произвольные значения вводятся справа в плашке —
// если тираж «свой», ручка встаёт на ближайший пресет (пузырёк = реальное число).
import { computed } from "vue";

const props = defineProps<{ presets: number[]; modelValue: number }>();
const emit = defineEmits<{ "update:modelValue": [v: number] }>();

const maxI = computed(() => Math.max(props.presets.length - 1, 1));
// индекс текущего тиража; «свой» (нет в пресетах) → ближайший по значению
const index = computed(() => {
  const exact = props.presets.indexOf(props.modelValue);
  if (exact >= 0) return exact;
  let best = 0, bd = Infinity;
  props.presets.forEach((q, j) => {
    const d = Math.abs(q - props.modelValue);
    if (d < bd) { bd = d; best = j; }
  });
  return best;
});
// позиция вдоль трека с поправкой на ширину ручки (центр едет thumbHalf…W-thumbHalf)
const posFor = (frac: number) => `calc(0.625rem + (100% - 1.25rem) * ${frac})`;
// Доля позиции по РЕАЛЬНОМУ значению (кусочно-линейно между метками) — пузырёк
// двигается плавно при ручном вводе и совпадает с ручкой на пресетах.
const fracForValue = (v: number) => {
  const p = props.presets;
  if (v <= p[0]) return 0;
  if (v >= p[p.length - 1]) return 1;
  for (let i = 0; i < p.length - 1; i++) {
    if (v >= p[i] && v <= p[i + 1]) {
      return (i + (v - p[i]) / (p[i + 1] - p[i])) / maxI.value;
    }
  }
  return 1;
};
const bubbleLeft = computed(() => posFor(fracForValue(props.modelValue)));
const onSlide = (e: Event) =>
  emit("update:modelValue", props.presets[+(e.target as HTMLInputElement).value]);
const onBubble = (e: Event) => {
  const v = Math.floor(+(e.target as HTMLInputElement).value);
  emit("update:modelValue", v >= 1 ? v : 1);
};
</script>

<template>
  <div class="qty">
    <div class="qty__rail">
      <!-- Пузырёк-поле над ручкой: daisyUI input + карандаш → явно редактируемое -->
      <label class="qty__bubble input input-sm" :style="{ left: bubbleLeft }">
        <input
          class="qty__field"
          type="number" min="1" :value="modelValue"
          @input="onBubble"
          aria-label="Тираж, шт"
        />
        <svg class="qty__pencil" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      </label>
      <input
        class="qty__range"
        type="range" :min="0" :max="maxI" step="1" :value="index"
        @input="onSlide"
        :aria-valuetext="`${modelValue} шт`"
        aria-label="Тираж"
      />
    </div>
    <div class="qty__marks">
      <button
        v-for="(q, i) in presets"
        :key="q"
        type="button"
        class="qty__mark"
        :class="{ 'qty__mark--on': i === index }"
        :style="{ left: posFor(presets.length > 1 ? i / maxI : 0) }"
        @click="emit('update:modelValue', q)"
      >{{ q }}</button>
    </div>
  </div>
</template>

<style scoped>
.qty { display: flex; flex-direction: column; gap: 0.15rem; max-width: 30rem; }
.qty__rail { position: relative; padding-top: 2.4rem; } /* место под пузырёк-инпут */

.qty__range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 0.375rem;
  margin: 0;
  border-radius: 999px;
  background: var(--color-base-300, #d6d3cd);
  cursor: pointer;
}
.qty__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: var(--color-primary, #1f1f1f);
  border: 2px solid var(--color-base-100, #fff);
  box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
  cursor: grab;
}
.qty__range::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: var(--color-primary, #1f1f1f);
  border: 2px solid var(--color-base-100, #fff);
  box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
  cursor: grab;
}
.qty__range:focus-visible { outline: 2px solid var(--color-primary, #1f1f1f); outline-offset: 4px; }

/* Пузырёк-поле текущего тиража над ручкой (daisyUI input + карандаш) */
.qty__bubble {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 6rem;
  gap: 0.3rem;
  padding-inline: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 14%);
  cursor: text;
}
/* Хвостик-указатель к ручке слайдера */
.qty__bubble::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--color-base-300, #d6d3cd);
}
.qty__field {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
  color: inherit;
}
.qty__field::-webkit-outer-spin-button,
.qty__field::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.qty__field { -moz-appearance: textfield; appearance: textfield; }
.qty__pencil { width: 0.85rem; height: 0.85rem; flex: none; opacity: 0.45; }

/* Метки-пресеты под треком (кликабельны) */
.qty__marks { position: relative; height: 1.25rem; }
.qty__mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.75rem;
  line-height: 1.2;
  color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
  cursor: pointer;
  white-space: nowrap;
}
.qty__mark:hover { color: var(--color-base-content); }
.qty__mark--on { color: var(--color-base-content); font-weight: 700; }
</style>
