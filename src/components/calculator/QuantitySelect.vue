<script setup lang="ts">
// Презентационный выбор тиража: плитки-пресеты (тираж + цена/шт) + поле «Другой
// тираж» + итог. Активная плитка — акцентная рамка (киноварь). Единый для всех
// калькуляторов; «Видов» (листовые) добавляет обёртка отдельно.
import { computed } from "vue";

const props = defineProps<{
  presets: number[];
  modelValue: number; // тираж (на вид)
  perUnit: (q: number) => number | null;
  total: number | null; // итог заказа для сводки
  totalQty: number; // итоговое количество для сводки
  money: (n: number) => string;
}>();
const emit = defineEmits<{ "update:modelValue": [v: number] }>();

// «Другой тираж»: пусто, если выбран пресет; иначе показываем своё значение.
const custom = computed(() => (props.presets.includes(props.modelValue) ? "" : props.modelValue));
const onCustom = (e: Event) => {
  const v = Math.floor(+(e.target as HTMLInputElement).value);
  emit("update:modelValue", v >= 1 ? v : 1);
};
// цена/шт целым числом (как на плитках)
const rate = (q: number) => {
  const r = props.perUnit(q);
  return r == null ? null : Math.round(r);
};
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="qsel">
      <button
        v-for="q in presets"
        :key="q"
        type="button"
        class="qsel__tile"
        :class="{ 'qsel__tile--on': modelValue === q }"
        :aria-pressed="modelValue === q"
        @click="emit('update:modelValue', q)"
      >
        <span class="qsel__qty">{{ q }}</span>
        <span class="qsel__rate" v-if="rate(q) != null">{{ rate(q) }} ₽/шт</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <!-- поле «Другой тираж» + доп. контролы (напр. «Видов») держим вместе -->
      <div class="flex items-center gap-3">
        <label class="input input-sm w-44">
          <input
            type="number"
            min="1"
            :value="custom"
            @input="onCustom"
            placeholder="Другой тираж"
            class="grow"
            aria-label="Другой тираж"
          />
          <span class="opacity-60">шт</span>
        </label>
        <slot />
      </div>
      <span class="text-sm ml-auto" v-if="total != null">
        <span class="font-bold">{{ totalQty }} шт</span>
        <span class="opacity-60"> ≈ {{ money(total) }} ₽</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.qsel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.qsel__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex: 1 1 0;
  min-width: 5.5rem;
  padding: 0.65rem 0.5rem;
  color: inherit;
  background: var(--color-base-100);
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-box, 0.5rem);
  cursor: pointer;
  transition: border-color 0.12s;
}
.qsel__tile:hover {
  border-color: var(--color-base-content);
}
.qsel__qty {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.1;
}
.qsel__rate {
  font-size: 0.78rem;
  opacity: 0.6;
}
/* активная плитка — акцентная рамка (единственный цвет монохрома) */
.qsel__tile--on {
  border-color: var(--color-accent-ink);
  border-width: 2px;
  padding: calc(0.65rem - 1px) calc(0.5rem - 1px);
}
.qsel__tile--on:hover {
  border-color: var(--color-accent-ink);
}
.qsel__tile--on .qsel__rate {
  color: var(--color-accent-ink);
  opacity: 1;
}
</style>
