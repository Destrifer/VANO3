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
const foldCount = computed(() =>
  calc.foldTypes?.length && calc.selectedFold ? calc.selectedFold.folds : 0,
);

// Спецрендер материала выводится из имени материала/цвета (как glossStrength от
// имени ламинации): прозрачная плёнка — «шахматка» сквозь основу; металлик/
// серебро/световозвращающая — диагональный блик. Плоский hex такие не передаёт.
const matSignature = computed(
  () => `${calc.currentPaper?.name ?? ""} ${calc.currentPaper?.materialType ?? ""} ${calc.colors[calc.selectedColorIndex]?.name ?? ""}`,
);
const isTransparent = computed(() => /прозрач/i.test(matSignature.value));
const isMetallic = computed(() => /серебр|металл|световозвр|золот/i.test(matSignature.value));

// «Шахматка» прозрачности (конвенция редакторов) поверх основы, приглушённо —
// чтобы читалась и подложка-цвет, и сквозной характер плёнки.
function drawTransparencyGrid(ctx: CanvasRenderingContext2D, r: Rect) {
  const sq = Math.max(6, Math.min(r.w, r.h) / 12);
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let iy = 0, y = r.y; y < r.y + r.h; iy++, y += sq) {
    for (let ix = 0, x = r.x; x < r.x + r.w; ix++, x += sq) {
      ctx.fillStyle = (ix + iy) % 2 ? "#ffffff" : "#cfd4d8";
      ctx.fillRect(x, y, Math.min(sq, r.x + r.w - x), Math.min(sq, r.y + r.h - y));
    }
  }
  ctx.restore();
}

// Металлический блик: диагональный светлый градиент поверх основы (серебро/фольга).
function drawMetallicSheen(ctx: CanvasRenderingContext2D, r: Rect) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.38, "rgba(255,255,255,0.32)");
  g.addColorStop(0.5, "rgba(255,255,255,0.62)");
  g.addColorStop(0.62, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
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

  // Буклеты: 3D-вид сложенного изделия (аккордеон) вместо плоского листа.
  if (foldCount.value > 0) {
    drawFolded(ctx, cssW, cssH);
    return;
  }

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
    foldCount: foldCount.value,
  };
  ctx.save();
  shapePath(ctx, r, radius, isRound.value);
  ctx.clip();
  if (isTransparent.value) drawTransparencyGrid(ctx, r);
  paperTexture(ctx, r, laminated.value ? 22 : 46, laminated.value ? 0.35 : 0.7);
  mockup.value.content(ctx, r, env);
  if (isMetallic.value) drawMetallicSheen(ctx, r);
  if (glossStrength.value > 0) laminationGloss(ctx, r, glossStrength.value);
  if (calc.foilOn && mockup.value.foil) mockup.value.foil(ctx, r, env);
  // линии сгиба (буклеты): пунктир, делит лист на панели foldCount+1
  if (foldCount.value > 0) {
    ctx.strokeStyle = "rgba(0,0,0,.4)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    const pw = r.w / (foldCount.value + 1);
    for (let i = 1; i <= foldCount.value; i++) {
      const fx = r.x + i * pw;
      ctx.beginPath();
      ctx.moveTo(fx, r.y);
      ctx.lineTo(fx, r.y + r.h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();

  // тонкий контур
  ctx.save();
  shapePath(ctx, r, radius, isRound.value);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.15)";
  ctx.stroke();
  ctx.restore();
}

// 3D-вид сложенного буклета: панели зигзагом (аккордеон), число панелей =
// сгибов + 1. Вид одинаков для всех типов фальцовки. Светотень даёт объём,
// плюс глянец ламинации и фольга на заголовке; контент — на каждой панели.
type Pt = { x: number; y: number };
function drawFolded(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  const panels = foldCount.value + 1;
  const cover = baseColor.value;
  const ink = inkColor(cover);
  const pad = Math.min(cssW, cssH) * 0.14;
  const availW = cssW - 2 * pad;
  const availH = cssH - 2 * pad;
  const sheetW = calc.dims.w || 297;
  const sheetH = calc.dims.h || 210;

  const ph = 100;
  const pw = ph * ((sheetW / panels) / sheetH);
  const depth = ph * 0.12; // глубина зигзага

  // панели зигзагом (аккордеон) — единый вид для всех типов фальцовки
  const raw: { c: Pt[]; shade: number }[] = [];
  for (let i = 0; i < panels; i++) {
    const lx = i * pw, rx = lx + pw, lyTop = (i % 2) * depth, ryTop = ((i + 1) % 2) * depth;
    raw.push({ c: [{ x: lx, y: lyTop }, { x: rx, y: ryTop }, { x: rx, y: ryTop + ph }, { x: lx, y: lyTop + ph }], shade: i % 2 ? -0.18 : 0.06 });
  }

  // вписать (bbox → масштаб + центрирование)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of raw) for (const pt of p.c) {
    minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
  }
  const bw = maxX - minX, bh = maxY - minY;
  const scale = Math.min(availW / bw, availH / bh);
  const ox = (cssW - bw * scale) / 2 - minX * scale;
  const oy = (cssH - bh * scale) / 2 - minY * scale;
  const T = (p: Pt): Pt => ({ x: p.x * scale + ox, y: p.y * scale + oy });
  const geom = raw.map((p) => ({ c: p.c.map(T), shade: p.shade }));

  const poly = (c: Pt[]) => {
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y);
    for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x, c[i].y);
    ctx.closePath();
  };
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const bil = (c: Pt[], u: number, v: number) => lerp(lerp(c[0], c[1], u), lerp(c[3], c[2], u), v);
  const band = (c: Pt[], u0: number, u1: number, v0: number, v1: number) => [bil(c, u0, v0), bil(c, u1, v0), bil(c, u1, v1), bil(c, u0, v1)];

  // мягкая тень под изделием
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.22)";
  ctx.shadowBlur = ph * scale * 0.06;
  ctx.shadowOffsetY = ph * scale * 0.04;
  for (const p of geom) { poly(p.c); ctx.fillStyle = cover; ctx.fill(); }
  ctx.restore();

  geom.forEach((p, idx) => {
    const c = p.c;
    poly(c); ctx.fillStyle = cover; ctx.fill();
    // светотень
    poly(c); ctx.fillStyle = p.shade >= 0 ? `rgba(255,255,255,${p.shade})` : `rgba(0,0,0,${-p.shade})`; ctx.fill();
    // глянец ламинации — выраженный диагональный блик
    if (glossStrength.value > 0) {
      const a = 0.45 * glossStrength.value;
      const g = ctx.createLinearGradient(c[0].x, c[0].y, c[2].x, c[2].y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.42, `rgba(255,255,255,${a})`);
      g.addColorStop(0.6, `rgba(255,255,255,${a * 0.2})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      poly(c); ctx.fillStyle = g; ctx.fill();
    }
    // контент на каждой панели: плашка изображения + заголовок (фольга) + строки
    poly(band(c, 0.14, 0.86, 0.08, 0.34)); ctx.fillStyle = ink; ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1;
    poly(band(c, 0.14, 0.62, 0.44, 0.49));
    if (calc.foilOn) {
      const a2 = bil(c, 0.14, 0.465), b2 = bil(c, 0.62, 0.465);
      const g2 = ctx.createLinearGradient(a2.x, a2.y, b2.x, b2.y);
      g2.addColorStop(0, foilHex.value); g2.addColorStop(0.5, "#fff7e0"); g2.addColorStop(1, foilHex.value);
      ctx.fillStyle = g2; ctx.fill();
    } else { ctx.fillStyle = ink; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = ink; ctx.globalAlpha = 0.3;
    for (let l = 0; l < 3; l++) {
      const v = 0.54 + l * 0.07, ww = l === 2 ? 0.5 : 0.82;
      poly(band(c, 0.14, 0.14 + ww, v, v + 0.028)); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // линия сгиба — правая кромка панели (кроме последней)
    if (idx < geom.length - 1) {
      ctx.beginPath(); ctx.moveTo(c[1].x, c[1].y); ctx.lineTo(c[2].x, c[2].y);
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1; ctx.stroke();
    }
  });
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
    foldCount.value, calc.foldTypeIndex,
    isTransparent.value, isMetallic.value, calc.selectedColorIndex,
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
