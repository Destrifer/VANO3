<script setup lang="ts">
// Макет: два пути — «есть макет» (загрузка → /api/upload, preflight Tier 1) и
// «макета нет» (дизайнер нарисует; стоимость согласует менеджер — на цену НЕ влияет,
// в заказ уходит только флаг needsDesign). Файл можно приложить в обоих режимах:
// в режиме дизайна это необязательный референс (логотип/пример).
import { inject, ref } from "vue";
import { sharedKey } from "../../composables/calcShared";

const calc = inject(sharedKey)!;
const status = ref<"idle" | "uploading" | "error">("idle");
const error = ref("");
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const dot: Record<string, string> = { green: "🟢", yellow: "🟡", red: "🔴" };

const ACCEPT = ".pdf,.ai,.eps,.psd,.cdr,.svg,.fig,.jpg,.jpeg,.png,.tif,.tiff";

async function upload(file: File) {
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
  }
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) upload(file);
  input.value = "";
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) upload(file);
}

function removeArtwork() {
  calc.artworkId = null;
  calc.artworkName = null;
  calc.artworkPreflight = null;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-semibold">Макет</span>

    <!-- Выбор пути -->
    <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Макет">
      <button
        type="button"
        role="radio"
        :aria-checked="calc.artworkMode === 'have'"
        class="flex flex-col gap-1 rounded-box border-2 p-3 text-left transition-colors"
        :class="calc.artworkMode === 'have'
          ? 'border-primary bg-primary/5'
          : 'border-base-300 hover:border-base-content/30'"
        @click="calc.artworkMode = 'have'"
      >
        <span class="flex items-center gap-2 font-semibold">
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12" />
          </svg>
          У меня есть макет
        </span>
        <span class="text-sm opacity-60">Загрузите файл сейчас или пришлите позже</span>
      </button>

      <button
        type="button"
        role="radio"
        :aria-checked="calc.artworkMode === 'design'"
        class="flex flex-col gap-1 rounded-box border-2 p-3 text-left transition-colors"
        :class="calc.artworkMode === 'design'
          ? 'border-primary bg-primary/5'
          : 'border-base-300 hover:border-base-content/30'"
        @click="calc.artworkMode = 'design'"
      >
        <span class="flex items-center gap-2 font-semibold">
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
          </svg>
          Макета нет — нарисуйте
        </span>
        <span class="text-sm opacity-60">Дизайнер подготовит макет и согласует с вами</span>
      </button>
    </div>

    <!-- Загруженный файл + preflight -->
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

    <!-- Зона загрузки (в режиме дизайна — необязательный референс) -->
    <div v-else class="rounded-box bg-base-200/50 p-3">
      <p v-if="calc.artworkMode === 'design'" class="mb-2 text-sm opacity-70">
        Есть логотип, пример или наброски? Приложите — необязательно.
      </p>
      <div
        class="cursor-pointer rounded-box border-2 border-dashed p-6 text-center transition-colors"
        :class="dragOver ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/30'"
        @click="fileInput?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <p class="text-sm">
          <span class="font-semibold">Перетащите файл</span> или нажмите для выбора
        </p>
        <p class="mt-1 text-xs opacity-50">PDF, JPG, PNG, TIFF до 50 МБ</p>
      </div>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="ACCEPT"
        :disabled="status === 'uploading'"
        @change="onChange"
      />
      <p v-if="status === 'uploading'" class="mt-2 text-sm opacity-70">Загрузка и проверка…</p>
      <p v-if="status === 'error'" class="mt-2 text-sm text-error">{{ error }}</p>
      <p class="mt-2 text-xs opacity-60">
        {{ calc.artworkMode === "design"
           ? "Дизайнер свяжется, обсудит задачу и согласует стоимость."
           : "Файл можно прислать позже — менеджер напомнит после оформления заказа." }}
      </p>
    </div>

    <!-- В режиме дизайна файл уже приложен → всё равно напоминаем про дизайнера -->
    <p v-if="calc.artworkMode === 'design' && calc.artworkName" class="text-xs opacity-60">
      Дизайнер свяжется, обсудит задачу и согласует стоимость.
    </p>
  </div>
</template>
