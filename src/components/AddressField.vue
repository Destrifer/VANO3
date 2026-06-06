<script setup lang="ts">
// Поле адреса с подсказками DaData (через наш прокси /api/address/suggest).
// v-model — строка адреса; событие select — структурный адрес (ФИАС/гео).
import { ref, watch } from "vue";

type Suggestion = { value: string; data: Record<string, any> };

const props = defineProps<{ modelValue?: string; placeholder?: string }>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  select: [suggestion: Suggestion];
}>();

const query = ref(props.modelValue ?? "");
const list = ref<Suggestion[]>([]);
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(query, (v) => {
  emit("update:modelValue", v);
  clearTimeout(timer);
  if (v.trim().length < 3) {
    list.value = [];
    open.value = false;
    return;
  }
  timer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/address/suggest?q=${encodeURIComponent(v)}`);
      const d = await r.json();
      list.value = d.suggestions ?? [];
      open.value = list.value.length > 0;
    } catch {
      list.value = [];
      open.value = false;
    }
  }, 250);
});

function pick(s: Suggestion) {
  query.value = s.value;
  emit("update:modelValue", s.value);
  emit("select", s);
  open.value = false;
}
function onBlur() {
  setTimeout(() => (open.value = false), 150);
}
</script>

<template>
  <div class="relative">
    <input
      class="input w-full"
      :value="query"
      @input="query = ($event.target as HTMLInputElement).value"
      @focus="open = list.length > 0"
      @blur="onBlur"
      :placeholder="placeholder ?? 'Город, улица, дом'"
      autocomplete="off"
    />
    <ul
      v-if="open"
      class="menu absolute z-30 mt-1 max-h-72 w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 shadow"
    >
      <li v-for="(s, i) in list" :key="i">
        <a @mousedown.prevent="pick(s)">{{ s.value }}</a>
      </li>
    </ul>
  </div>
</template>
