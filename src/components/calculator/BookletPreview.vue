<script setup lang="ts">
// Превью многостраничной (общий движок): формат, толщина блока по числу полос,
// конструкция (мягкая/твёрдая обложка, кольца, ремешок), переплёт, текстура,
// глянец ламинации и фольга. «Куклу» — ink на обложке — рисует сцена из реестра
// `covers.ts` по `preview_kind`, ровно как Preview.vue берёт сцену из `mockups`.
// Реактивно перерисовывается от mpCalc и по ресайзу.
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { mpCalcKey } from "../../composables/useMultipageCalculator";
import { laminationGloss, paperTexture, inkColor, type Rect } from "../../lib/preview/primitives";
import { bindingKindOf, getCover, type CoverEnv } from "../../lib/preview/covers";

const calc = inject(mpCalcKey)!;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

const coverHex = computed(() => calc.coverColors?.[calc.coverColorIndex]?.hex ?? "#ece7dc");
const foilHex = computed(() => calc.foilOption?.colors?.[calc.foilColorIndex]?.hex ?? "#d9b44a");
const bindingKind = computed(() => bindingKindOf(calc.binding?.name));
const cover = computed(() => getCover(calc.previewKind));
// Ламинация обложки до сих пор не доезжала до превью, хотя в калькуляторе
// выбирается: сила блика выводится из имени, как в Preview.vue.
const glossStrength = computed(() => {
  const name = calc.laminationOptions[calc.laminationIndex]?.name ?? "";
  if (calc.laminationIndex < 0) return 0;
  if (/гл[яа]нц/i.test(name)) return 1;
  if (/soft|мат/i.test(name)) return 0.25;
  return 0.6;
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

  const env: CoverEnv = {
    ink: inkColor(coverHex.value),
    cover: coverHex.value,
    foilOn: calc.foilOn,
    foilHex: foilHex.value,
    binding: bindingKind.value,
    pages: calc.pages || 0,
    ruling: calc.ruling ?? null,
    mm: { w: calc.dims.w || 148, h: calc.dims.h || 210 },
  };

  // Сцена может отрисовать себя целиком — изделие, которое физически не книжка
  // (газета). Общий stage ей врёт не в деталях, а полностью.
  const scene = cover.value;
  if (scene.render) {
    scene.render(ctx, cssW, cssH, env);
    return;
  }

  const aw = env.mm.w;
  const ah = env.mm.h;
  const aspect = aw / ah;
  const fpad = Math.min(cssW, cssH) * 0.16;
  const availH = cssH - 2 * fpad;
  const availW = cssW - 2 * fpad;
  let cw = availH * aspect;
  let ch = availH;
  if (cw > availW) { cw = availW; ch = cw / aspect; }

  const hard = bindingKind.value === "hardcover";
  const rings = scene.features?.rings === true && bindingKind.value === "spiral";
  const thickness = Math.min(cw * 0.1, 3 + (calc.pages || 0) * 0.12);
  const coilW = bindingKind.value === "spiral" ? Math.max(6, cw * 0.06) : 0;
  // Твёрдый переплёт: слева объёмный корешок шириной с блок, поэтому обложку
  // сдвигаем вправо на его толщину; мягкий — стопка торчит вправо-вниз.
  const x = (cssW - cw - thickness) / 2 + coilW / 2 + (hard ? thickness : 0);
  const y = (cssH - ch) / 2;
  const m = Math.min(cw, ch);
  const rad = hard ? m * 0.02 : m * 0.03;

  if (hard) {
    // Объёмный корешок 7БЦ: узкая грань слева со слабым скруглением. Выпуклость
    // держим маленькой — на большой обложка читается «пузырём», а не книгой.
    const bulge = thickness * 0.45;
    const spinePath = () => {
      ctx.beginPath();
      ctx.moveTo(x, y - m * 0.012);
      ctx.quadraticCurveTo(x - bulge, y + ch / 2, x, y + ch + m * 0.012);
      ctx.lineTo(x + thickness, y + ch + m * 0.012);
      ctx.lineTo(x + thickness, y - m * 0.012);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = m * 0.07;
    ctx.shadowOffsetY = m * 0.03;
    spinePath();
    ctx.fillStyle = coverHex.value;
    ctx.fill();
    ctx.restore();
    const sg = ctx.createLinearGradient(x - bulge, 0, x + thickness, 0);
    sg.addColorStop(0, "rgba(0,0,0,.42)");
    sg.addColorStop(0.45, "rgba(0,0,0,.12)");
    sg.addColorStop(0.8, "rgba(255,255,255,.06)");
    sg.addColorStop(1, "rgba(0,0,0,.3)"); // штробa: линия сгиба у корешка
    ctx.save();
    spinePath();
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();

    // Блок утоплен под кант обложки — виден узкой каймой среза справа/снизу.
    const inset = m * 0.02;
    ctx.save();
    ctx.fillStyle = "#f4f1ea";
    roundRect(ctx, { x: x + inset, y: y + inset, w: cw - inset, h: ch - 2 * inset }, rad * 0.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else {
    // 1. Стопка страниц (намёк на толщину)
    for (let i = Math.ceil(thickness / 2); i > 0; i--) {
      const off = i * 1.5;
      ctx.save();
      roundRect(ctx, { x: x + off, y: y + off, w: cw, h: ch }, rad);
      ctx.fillStyle = i % 2 ? "#f7f5f0" : "#eceae4";
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. Обложка + тень. У твёрдой обложка чуть больше блока (кант).
  const coverRect: Rect = hard
    ? { x: x - m * 0.012, y: y - m * 0.012, w: cw + m * 0.012, h: ch + m * 0.024 }
    : { x, y, w: cw, h: ch };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.28)";
  ctx.shadowBlur = m * 0.1;
  ctx.shadowOffsetY = m * 0.04;
  roundRect(ctx, coverRect, rad);
  ctx.fillStyle = coverHex.value;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, coverRect, rad);
  ctx.clip();
  paperTexture(ctx, coverRect, 30, 0.35);

  // затенение у корешка (слева) — даёт изгиб страницы
  const spineW = cw * (bindingKind.value === "glue" || hard ? 0.1 : 0.06);
  const spine = ctx.createLinearGradient(coverRect.x, 0, coverRect.x + spineW, 0);
  spine.addColorStop(0, "rgba(0,0,0,.2)");
  spine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(coverRect.x, coverRect.y, spineW, coverRect.h);

  // 3. «Кукла» продукта — только ink; поле под спираль не занимаем
  const contentRect: Rect = {
    x: coverRect.x + coilW,
    y: coverRect.y,
    w: coverRect.w - coilW,
    h: coverRect.h,
  };
  scene.content(ctx, contentRect, env);

  // 4. Ламинация обложки и фольга — общими механизмами, поверх сцены
  if (glossStrength.value > 0) laminationGloss(ctx, coverRect, glossStrength.value);
  if (calc.foilOn && scene.foil) scene.foil(ctx, contentRect, env);
  ctx.restore();

  // контур обложки
  ctx.save();
  roundRect(ctx, coverRect, rad);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.15)";
  ctx.stroke();
  ctx.restore();

  // 5. Переплёт (поверх левого края) и аксессуары конструкции
  drawBinding(ctx, x, y, ch, coilW, rings, hard);
  if (scene.features?.strap) drawStrap(ctx, coverRect, m);
}

// Переплёт. `rings` — кольцевой механизм вместо спирали (тетради на кольцах):
// та же пружина по цене, но узнаётся иначе.
function drawBinding(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, ch: number, coilW: number,
  rings: boolean, hard: boolean,
) {
  const kind = bindingKind.value;
  if (kind === "spiral" && rings) {
    ctx.save();
    ctx.lineWidth = Math.max(2, coilW * 0.24);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const cyR = y + ch * (0.22 + i * 0.28);
      const rr = coilW * 1.1;
      const g = ctx.createLinearGradient(x - rr, cyR - rr, x + rr, cyR + rr);
      g.addColorStop(0, "#8d8d8d");
      g.addColorStop(0.45, "#e8e8e8");
      g.addColorStop(1, "#6f6f6f");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.arc(x, cyR, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === "spiral") {
    const n = Math.max(8, Math.round(ch / 14));
    const gap = ch / n;
    const rh = Math.min(gap * 0.7, 10);
    ctx.lineWidth = Math.max(1.5, coilW * 0.18);
    ctx.strokeStyle = "rgba(70,70,70,.85)";
    for (let i = 0; i < n; i++) {
      const cyR = y + gap * (i + 0.5);
      ctx.beginPath();
      ctx.ellipse(x, cyR, coilW, rh / 2, 0, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    }
  } else if (kind === "staple") {
    ctx.fillStyle = "rgba(110,110,110,.95)";
    const sw = Math.max(2, ch * 0.012);
    const sh = ch * 0.06;
    for (const fy of [y + ch * 0.28, y + ch * 0.66]) {
      ctx.fillRect(x + ch * 0.012, fy, sw, sh);
    }
  } else if (!hard) {
    // glue — плотный корешок уже нарисован (spineW шире); добавим тонкую линию
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 2, y + ch);
    ctx.stroke();
  }
  // hardcover — объёмный корешок нарисован в draw(), добавлять нечего
}

// Резинка-ремешок и ляссе — признак ежедневника. Рисует движок, чтобы у всех
// продуктов с этой конструкцией они выглядели одинаково.
function drawStrap(ctx: CanvasRenderingContext2D, r: Rect, m: number) {
  const sw = Math.max(3, m * 0.028);
  const sx = r.x + r.w * 0.84;
  ctx.save();
  const g = ctx.createLinearGradient(sx, 0, sx + sw, 0);
  g.addColorStop(0, "rgba(30,28,26,.95)");
  g.addColorStop(0.4, "rgba(78,74,68,.95)");
  g.addColorStop(1, "rgba(24,22,20,.95)");
  ctx.fillStyle = g;
  ctx.fillRect(sx, r.y - m * 0.01, sw, r.h + m * 0.02);
  ctx.restore();

  // ляссе — лента из блока снизу
  const lw = Math.max(2, m * 0.018);
  const lx = r.x + r.w * 0.3;
  ctx.save();
  ctx.fillStyle = "rgba(150,40,45,.9)";
  ctx.fillRect(lx, r.y + r.h - m * 0.02, lw, m * 0.12);
  ctx.beginPath();
  ctx.moveTo(lx, r.y + r.h + m * 0.1);
  ctx.lineTo(lx + lw / 2, r.y + r.h + m * 0.07);
  ctx.lineTo(lx + lw, r.y + r.h + m * 0.1);
  ctx.closePath();
  ctx.fillStyle = "rgba(120,32,36,.9)";
  ctx.fill();
  ctx.restore();
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
  () => [
    calc.dims.w, calc.dims.h, coverHex.value, calc.foilOn, foilHex.value,
    bindingKind.value, calc.pages, calc.previewKind, calc.ruling,
    calc.laminationIndex, glossStrength.value,
  ],
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
