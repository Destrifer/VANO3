<script setup lang="ts">
// ПРЕВЬЮ (общий движок): геометрия (форма/размер/скругление) → контур,
// универсальные слои материи (текстура/глянец), а «рыбу» рисует макет продукта
// из реестра (mockups). Всё питается от calc; перерисовка реактивная и по ресайзу.
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { calcKey } from "../../composables/useCalculator";
import { shapePath, paperTexture, laminationGloss, inkColor, type Rect } from "../../lib/preview/primitives";
import { getMockup } from "../../lib/preview/mockups";

const calc = inject(calcKey)!;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

const isRound = computed(() => calc.shape === "round");
const baseColor = computed(() => calc.colors[calc.selectedColorIndex]?.hex ?? "#f3efe6");
const laminated = computed(() => calc.laminationIndex >= 0);
const glossStrength = computed(() => {
  const name = calc.laminationOptions[calc.laminationIndex]?.name ?? "";
  if (/гл[яа]нц/i.test(name)) return 1;
  if (/soft|мат/i.test(name)) return 0.25;
  return laminated.value ? 0.6 : 0;
});
const foilHex = computed(() => calc.foilOption?.colors?.[calc.foilColorIndex]?.hex ?? "#d9b44a");
const cornersRounded = computed(() =>
  calc.product.finishing.some((o, i) => o.unit === "per_corner" && calc.fin[i]?.checked),
);
const mockup = computed(() => getMockup(calc.product.previewKind));

function draw() {
  const cv = canvasRef.value;
  const parent = cv?.parentElement;
  if (!cv || !parent) return;
  const cssW = parent.clientWidth;
  if (cssW < 2) return;
  const cssH = cssW * 0.66;
  const dpr = window.devicePixelRatio || 1;
  cv.style.height = `${cssH}px`;
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  // вписать карточку нужной пропорции в рамку с полями
  const aw = isRound.value ? 1 : calc.dims.w || 90;
  const ah = isRound.value ? 1 : calc.dims.h || 50;
  const aspect = aw / ah;
  const fpad = Math.min(cssW, cssH) * 0.14;
  const availW = cssW - 2 * fpad, availH = cssH - 2 * fpad;
  let cw = availW, ch = cw / aspect;
  if (ch > availH) { ch = availH; cw = ch * aspect; }
  const x = (cssW - cw) / 2, y = (cssH - ch) / 2;
  const minSide = Math.min(cw, ch);
  const radius = isRound.value
    ? minSide / 2
    : cornersRounded.value ? minSide * 0.12 : minSide * 0.03;
  const r: Rect = { x, y, w: cw, h: ch };

  // тень под карточкой
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.25)";
  ctx.shadowBlur = minSide * 0.12;
  ctx.shadowOffsetY = minSide * 0.05;
  shapePath(ctx, r, radius, isRound.value);
  ctx.fillStyle = baseColor.value;
  ctx.fill();
  ctx.restore();

  // материя + содержимое внутри контура: текстура → «рыба» → глянец → фольга
  const env = {
    round: isRound.value,
    ink: inkColor(baseColor.value),
    foilOn: calc.foilOn,
    foilHex: foilHex.value,
  };
  ctx.save();
  shapePath(ctx, r, radius, isRound.value);
  ctx.clip();
  paperTexture(ctx, r, laminated.value ? 22 : 46, laminated.value ? 0.35 : 0.7);
  mockup.value.content(ctx, r, env);
  if (glossStrength.value > 0) laminationGloss(ctx, r, glossStrength.value);
  if (calc.foilOn && mockup.value.foil) mockup.value.foil(ctx, r, env);
  ctx.restore();

  // тонкий контур
  ctx.save();
  shapePath(ctx, r, radius, isRound.value);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.15)";
  ctx.stroke();
  ctx.restore();
}

// Миниатюра текущего превью (даунскейл ~240px) для позиции корзины.
function captureThumb(): string | null {
  const cv = canvasRef.value;
  if (!cv || !cv.width) return null;
  const tw = 240;
  const th = Math.round((tw * cv.height) / cv.width);
  const off = document.createElement("canvas");
  off.width = tw;
  off.height = th;
  const c = off.getContext("2d");
  if (!c) return null;
  c.fillStyle = "#ffffff"; // JPEG без альфы → прозрачное стало бы чёрным; заливаем белым
  c.fillRect(0, 0, tw, th);
  c.drawImage(cv, 0, 0, tw, th);
  return off.toDataURL("image/jpeg", 0.85);
}

onMounted(() => {
  requestAnimationFrame(draw);
  calc.setThumbProvider(captureThumb);
  ro = new ResizeObserver(() => draw());
  if (canvasRef.value?.parentElement) ro.observe(canvasRef.value.parentElement);
});
onBeforeUnmount(() => ro?.disconnect());

watch(
  () => [
    calc.dims.w, calc.dims.h, isRound.value, baseColor.value,
    calc.laminationIndex, glossStrength.value,
    calc.foilOn, foilHex.value, cornersRounded.value, calc.product.previewKind,
  ],
  () => draw(),
);
</script>

<template>
  <div class="card card-border border-base-content">
    <div class="card-body gap-3">
      <canvas ref="canvasRef" class="block w-full"></canvas>
      <p class="text-center text-xs opacity-60">
        Предпросмотр материала и формы. Дизайн — после загрузки макета.
      </p>
    </div>
  </div>
</template>
