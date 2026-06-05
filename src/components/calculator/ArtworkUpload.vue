<script setup lang="ts">
// Загрузка макета на странице товара → /api/upload → id файла в calc.
// Необязательно: можно прислать позже.
import { inject, ref } from "vue";
import { calcKey } from "../../composables/useCalculator";

const calc = inject(calcKey)!;
const status = ref<"idle" | "uploading" | "error">("idle");
const error = ref("");

async function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  status.value = "uploading";
  error.value = "";
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.fileId) throw new Error(data.error || "Ошибка загрузки");
    calc.artworkId = data.fileId;
    calc.artworkName = data.fileName ?? file.name;
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
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-semibold">Макет</span>

    <div v-if="calc.artworkName" class="flex items-center gap-3">
      <span class="text-sm">📎 {{ calc.artworkName }}</span>
      <button type="button" class="btn btn-ghost btn-xs" @click="removeArtwork">убрать</button>
    </div>

    <template v-else>
      <input
        type="file"
        class="file-input max-w-xs"
        accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
        :disabled="status === 'uploading'"
        @change="onChange"
      />
      <span v-if="status === 'uploading'" class="text-sm opacity-70">Загрузка…</span>
      <span v-if="status === 'error'" class="text-sm text-error">{{ error }}</span>
      <span class="text-xs opacity-60">PDF, JPG, PNG, TIFF до 50 МБ. Можно прислать позже.</span>
    </template>
  </div>
</template>
