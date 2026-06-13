<script setup lang="ts">
// Карта офиса на Яндекс JS API 2.1: своя кликабельная метка с балуном
// (адрес / часы / телефон). Маршрут строится по кнопке «Построить маршрут»
// в правой колонке (deep-link в Яндекс.Карты).
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{
  apiKey: string;
  officeLat: number;
  officeLng: number;
  address: string;
  companyName?: string;
  hours?: string | null;
  phone?: string | null;
  zoom?: number;
}>();

const mapEl = ref<HTMLElement | null>(null);
const mapError = ref(false);
let map: any = null;

const zoom = props.zoom ?? 16;
const fallbackLink = `https://yandex.ru/maps/?mode=routes&rtext=~${props.officeLat},${props.officeLng}&rtt=auto`;

// — загрузка скрипта JS API один раз на страницу —
let loaderPromise: Promise<any> | null = null;
function loadYmaps(apikey: string): Promise<any> {
  if ((window as any).ymaps?.Map) return Promise.resolve((window as any).ymaps);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${apikey}&lang=ru_RU`;
    s.async = true;
    s.onload = () => (window as any).ymaps.ready(() => resolve((window as any).ymaps));
    s.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

function balloonBody(): string {
  const tel = props.phone?.replace(/[^\d+]/g, "");
  return [
    props.address,
    props.hours ?? "",
    tel ? `<a href="tel:${tel}">${props.phone}</a>` : "",
  ]
    .filter(Boolean)
    .join("<br>");
}

onMounted(async () => {
  if (!props.apiKey) {
    mapError.value = true;
    return;
  }
  try {
    const ymaps = await loadYmaps(props.apiKey);
    map = new ymaps.Map(
      mapEl.value,
      {
        center: [props.officeLat, props.officeLng], // 2.1: порядок [lat, lng]
        zoom,
        controls: ["zoomControl"],
      },
      { suppressMapOpenBlock: true },
    );

    const office = new ymaps.Placemark(
      [props.officeLat, props.officeLng],
      {
        balloonContentHeader: props.companyName ?? "Офис",
        balloonContentBody: balloonBody(),
        hintContent: props.companyName ?? props.address,
      },
      {
        iconLayout: "default#image",
        iconImageHref: "/office-marker.svg",
        iconImageSize: [40, 48],
        iconImageOffset: [-20, -48], // остриё в точку
      },
    );
    map.geoObjects.add(office);
  } catch {
    mapError.value = true;
  }
});

onBeforeUnmount(() => {
  if (map) map.destroy();
  map = null;
});
</script>

<template>
  <div class="cr-map">
    <div ref="mapEl" class="cr-mapcanvas" />
    <div v-if="mapError" class="cr-map-fallback">
      <p>Карта временно недоступна.</p>
      <a class="btn btn-sm btn-primary" :href="fallbackLink" target="_blank" rel="noopener">
        Открыть маршрут в Яндекс.Картах
      </a>
    </div>
  </div>
</template>

<style scoped>
.cr-map {
  position: relative;
  aspect-ratio: 4 / 3;
  min-height: 360px;
  overflow: hidden;
  border-radius: var(--radius-box, 1rem);
  border: var(--border, 1px) solid var(--color-base-300);
  background: var(--color-base-200);
}
.cr-mapcanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cr-map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 1rem;
}
</style>
