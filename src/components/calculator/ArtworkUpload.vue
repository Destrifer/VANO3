<script setup lang="ts">
// Загрузка макета на странице товара → /api/upload (валидация + preflight Tier 1).
// Показывает светофор и замечания. Необязательно: можно прислать позже.
import { inject, ref } from "vue";
import { sharedKey } from "../../composables/calcShared";

const calc = inject(sharedKey)!;
const status = ref<"idle" | "uploading" | "error">("idle");
const error = ref("");

const dot: Record<string, string> = { green: "🟢", yellow: "🟡", red: "🔴" };

async function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  status.value = "uploading";
  error.value = "";
  try {
    const fd = new FormData();
    fd.append("file", file);
    // контекст заказа для preflight
    fd.append("width", String(calc.dims.w));
    fd.append("height", String(calc.dims.h));
    fd.append("sides", calc.sides);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.fileId) throw new Error(data.error || "Ошибка загрузки");
    calc.artworkId = data.fileId;
    calc.artworkName = data.fileName ?? file.name;
    calc.artworkPreflight = data.preflight ?? null;
    status.value = "idle";
  } catch (err: any) {
    status.value = "error";
    error.value = err?.message ?? "Ошибка загрузки";
  } finally {
    input.value = "";
  }
}

function removeArtwork() {
  calc.artworkId = null;
  calc.artworkName = null;
  calc.artworkPreflight = null;
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Макет</span>

    <div v-if="calc.artworkName" class="flex flex-col gap-1.5">
      <div class="flex items-center gap-3">
        <span class="text-sm">📎 {{ calc.artworkName }}</span>
        <button type="button" class="btn btn-ghost btn-xs" @click="removeArtwork">убрать</button>
      </div>

      <!-- исходник без авто-проверки -->
      <div v-if="!calc.artworkPreflight" class="text-sm opacity-70">
        ⚪ Формат принят — макет проверит специалист.
      </div>

      <!-- результат preflight -->
      <div v-else class="rounded-box border border-base-300 p-2 text-sm">
        <div class="font-medium">
          {{ dot[calc.artworkPreflight.status] }}
          {{ calc.artworkPreflight.status === "green" ? "Макет в норме"
             : calc.artworkPreflight.status === "yellow" ? "Можно печатать, есть замечания"
             : "Есть проблема — проверьте макет" }}
        </div>
        <ul v-if="calc.artworkPreflight.checks.length" class="mt-1 flex flex-col gap-0.5">
          <li v-for="(c, i) in calc.artworkPreflight.checks" :key="i" class="opacity-80"
              :class="{ 'text-error': c.level === 'error' }">
            {{ c.level === "ok" ? "✓" : c.level === "warn" ? "⚠" : "✕" }} {{ c.message }}
          </li>
        </ul>
        <p class="mt-1 text-xs opacity-60">Это предварительная проверка. Точно — после согласования макета.</p>
      </div>
    </div>

    <template v-else>
      <input
        type="file"
        class="file-input max-w-xs"
        accept=".pdf,.ai,.eps,.psd,.cdr,.svg,.fig,.jpg,.jpeg,.png,.tif,.tiff"
        :disabled="status === 'uploading'"
        @change="onChange"
      />
      <span v-if="status === 'uploading'" class="text-sm opacity-70">Загрузка и проверка…</span>
      <span v-if="status === 'error'" class="text-sm text-error">{{ error }}</span>
      <span class="text-xs opacity-60">PDF, JPG, PNG, TIFF до 50 МБ. Можно прислать позже.</span>
    </template>
  </div>
</template>
