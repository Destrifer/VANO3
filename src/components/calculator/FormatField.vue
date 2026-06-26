<script setup lang="ts">
// Презентационный выбор размера/формата: пресеты (select) ↔ «свой размер» НА МЕСТЕ
// (ввод Ш×В + кнопка «из списка»), фикс-ширина слота → без сдвига контента.
// Тот же паттерн, что у SizeField визиток. index = -1 → режим «свой размер».
import { computed } from "vue";
const props = defineProps<{
  label?: string;
  sizes: { label: string }[];
  allowCustom: boolean;
  index: number;
  customMode: boolean;
  customW: number;
  customH: number;
  min?: number;
  max?: number;
}>();
const emit = defineEmits<{
  "update:index": [v: number];
  "update:customW": [v: number];
  "update:customH": [v: number];
  back: [];
}>();

// v-model-прокси: биндинг select через :value+@change терял серверный пресет
// (formatIndex) при гидрации острова — тот же баг, что чинили в PaperSelect.
// computed get/set сохраняет SSR-значение до клиента (см. gotcha в PLAYBOOK).
const indexProxy = computed({
  get: () => props.index,
  set: (v: number) => emit("update:index", v),
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">{{ label ?? "Размер" }}</span>
    <!-- Слот фикс. ширины: select ↔ свой размер на месте -->
    <div class="w-72 max-w-full">
      <div v-if="customMode" class="flex items-center gap-2">
        <input
          type="number" class="input w-20" :min="min" :max="max" :value="customW"
          @input="emit('update:customW', +($event.target as HTMLInputElement).value)"
        />
        <span>×</span>
        <input
          type="number" class="input w-20" :min="min" :max="max" :value="customH"
          @input="emit('update:customH', +($event.target as HTMLInputElement).value)"
        />
        <span class="text-sm opacity-70">мм</span>
        <button type="button" class="btn btn-ghost btn-sm" @click="emit('back')">из списка</button>
      </div>
      <select v-else class="select w-full" v-model.number="indexProxy">
        <option v-for="(s, i) in sizes" :key="i" :value="i">{{ s.label }}</option>
        <option v-if="allowCustom" :value="-1">Свой размер…</option>
      </select>
    </div>
    <slot name="hint" />
  </div>
</template>
