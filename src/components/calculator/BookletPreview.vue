<script setup lang="ts">
// Превью многостраничной: обложка (формат/цвет бумаги), намёк на толщину блока
// (по числу полос), переплёт (пружина — спираль, скоба — скобки, КБС — корешок)
// и фольга на заголовке. Реактивно перерисовывается от mpCalc и по ресайзу.
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { mpCalcKey } from "../../composables/useMultipageCalculator";
import { paperTexture, type Rect } from "../../lib/preview/primitives";

const calc = inject(mpCalcKey)!;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

const coverHex = computed(() => calc.coverColors?.[calc.coverColorIndex]?.hex ?? "#ece7dc");
const foilHex = computed(() => calc.foilOption?.colors?.[calc.foilColorIndex]?.hex ?? "#d9b44a");
const bindingKind = computed(() => {
  const n = calc.binding?.name ?? "";
  if (/пружин|spiral/i.test(n)) return "spiral";
  if (/кбс|клеев|glue/i.test(n)) return "glue";
  return "staple";
});

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, rad: number) {
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

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

  // нейтральный фон сцены — чтобы светлая обложка читалась
  const bg = ctx.createLinearGradient(0, 0, 0, cssH);
  bg.addColorStop(0, "#efece6");
  bg.addColorStop(1, "#e3dfd7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const aw = calc.dims.w || 148;
  const ah = calc.dims.h || 210;
  const aspect = aw / ah;
  const fpad = Math.min(cssW, cssH) * 0.16;
  const availH = cssH - 2 * fpad;
  const availW = cssW - 2 * fpad;
  let cw = availH * aspect;
  let ch = availH;
  if (cw > availW) { cw = availW; ch = cw / aspect; }

  const thickness = Math.min(cw * 0.1, 3 + (calc.pages || 0) * 0.12);
  const coilW = bindingKind.value === "spiral" ? Math.max(6, cw * 0.06) : 0;
  const x = (cssW - cw - thickness) / 2 + coilW / 2;
  const y = (cssH - ch) / 2;
  const rad = Math.min(cw, ch) * 0.03;

  // 1. Стопка страниц (намёк на толщину)
  for (let i = Math.ceil(thickness / 2); i > 0; i--) {
    const off = i * 1.5;
    ctx.save();
    roundRect(ctx, { x: x + off, y: y + off, w: cw, h: ch }, rad);
    ctx.fillStyle = i % 2 ? "#f7f5f0" : "#eceae4";
    ctx.fill();
    ctx.restore();
  }

  // 2. Обложка + тень
  const cover: Rect = { x, y, w: cw, h: ch };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.28)";
  ctx.shadowBlur = Math.min(cw, ch) * 0.1;
  ctx.shadowOffsetY = Math.min(cw, ch) * 0.04;
  roundRect(ctx, cover, rad);
  ctx.fillStyle = coverHex.value;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, cover, rad);
  ctx.clip();
  paperTexture(ctx, cover, 30, 0.35);

  // корешок (слева)
  const spineW = cw * (bindingKind.value === "glue" ? 0.1 : 0.06);
  const spine = ctx.createLinearGradient(x, 0, x + spineW, 0);
  spine.addColorStop(0, "rgba(0,0,0,.2)");
  spine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(x, y, spineW, ch);

  // «рыба»: заголовок (фольга — металлик) + подзаголовок + строки
  const cx = x + cw / 2 + coilW / 2;
  ctx.textAlign = "center";
  ctx.font = `700 ${cw * 0.11}px system-ui, sans-serif`;
  if (calc.foilOn) {
    const g = ctx.createLinearGradient(0, y + ch * 0.28, 0, y + ch * 0.38);
    g.addColorStop(0, foilHex.value);
    g.addColorStop(0.5, "#fff7e0");
    g.addColorStop(1, foilHex.value);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = "rgba(40,38,34,.85)";
  }
  ctx.fillText("Брошюра", cx, y + ch * 0.34);
  ctx.font = `400 ${cw * 0.05}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(40,38,34,.55)";
  ctx.fillText("каталог · 2026", cx, y + ch * 0.42);
  ctx.fillStyle = "rgba(40,38,34,.25)";
  const lineW = cw * 0.5;
  for (let i = 0; i < 3; i++) ctx.fillRect(cx - lineW / 2, y + ch * (0.62 + i * 0.07), lineW, ch * 0.012);
  ctx.restore();

  // контур обложки
  ctx.save();
  roundRect(ctx, cover, rad);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.15)";
  ctx.stroke();
  ctx.restore();

  // 3. Переплёт (поверх левого края)
  drawBinding(ctx, x, y, ch, coilW);
}

function drawBinding(ctx: CanvasRenderingContext2D, x: number, y: number, ch: number, coilW: number) {
  const kind = bindingKind.value;
  if (kind === "spiral") {
    const rings = Math.max(8, Math.round(ch / 14));
    const gap = ch / rings;
    const rw = coilW;
    const rh = Math.min(gap * 0.7, 10);
    ctx.lineWidth = Math.max(1.5, coilW * 0.18);
    ctx.strokeStyle = "rgba(70,70,70,.85)";
    for (let i = 0; i < rings; i++) {
      const cyR = y + gap * (i + 0.5);
      ctx.beginPath();
      ctx.ellipse(x, cyR, rw, rh / 2, 0, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    }
  } else if (kind === "staple") {
    ctx.fillStyle = "rgba(110,110,110,.95)";
    const sw = Math.max(2, ch * 0.012);
    const sh = ch * 0.06;
    for (const fy of [y + ch * 0.28, y + ch * 0.66]) {
      ctx.fillRect(x + ch * 0.012, fy, sw, sh);
    }
  } else {
    // glue — плотный корешок уже нарисован (spineW шире); добавим тонкую линию
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 2, y + ch);
    ctx.stroke();
  }
}

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
  c.fillStyle = "#ffffff";
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
  () => [calc.dims.w, calc.dims.h, coverHex.value, calc.foilOn, foilHex.value, bindingKind.value, calc.pages],
  () => draw(),
);
</script>

<template>
  <div class="card card-border border-base-content">
    <div class="card-body gap-3">
      <canvas ref="canvasRef" class="block w-full"></canvas>
      <p class="text-center text-xs opacity-60">
        Предпросмотр формата, переплёта и обложки. Дизайн — после загрузки макета.
      </p>
    </div>
  </div>
</template>
