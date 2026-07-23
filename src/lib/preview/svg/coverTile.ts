// Плитка каталога для МНОГОСТРАНИЧНЫХ: инлайновый SVG обложки, отрисованный на
// сборке. Аналог `tile.ts`, но stage другой — книжка, а не плоский лист:
// корешок, толщина блока по числу полос, переплёт (скоба/пружина/кольца/клей/
// 7БЦ), кант твёрдой обложки, ремешок с ляссе. Повторяет геометрию
// `BookletPreview.vue::draw()` БЕЗ материи, глянца и фольги — плитке нужен
// узнаваемый силуэт.
//
// Сцену берёт из реестра `covers.ts` — того же, что и живое превью (инвариант 1).
import type { ProductPricing } from "../../pricing/data";
import { PAGE_STEP } from "../../pricing/engine";
import { bindingKindOf, getCover, type BindingKind, type CoverEnv } from "../covers";
import { inkColor, roundRect, type Rect } from "../primitives";
import { SvgContext } from "./context";
import { W, H } from "./tile";

// Нейтральная обложка — тот же дефолт, что у живого превью (BookletPreview).
const COVER = "#ece7dc";

export type CoverTileInput = {
  previewKind?: string | null;
  mm?: { w: number; h: number } | null;
  binding: BindingKind;
  pages: number;
  ruling?: string | null;
  cover?: string;
};

// Дефолт КАЛЬКУЛЯТОРА, а не абстрактный: полосы = clampPages(8) по реальным
// переплётам продукта, переплёт = первый совместимый с этим числом полос
// (`autoBinding`). Иначе плитка соврёт: у ежедневника и выпускного альбома 7БЦ
// стоит первым и выбран по умолчанию, а тетрадь открывается на скрепке.
export function defaultCoverTileInput(cfg: ProductPricing): CoverTileInput {
  const bs = cfg.bindings;
  const allMin = bs.length ? Math.min(...bs.map((b) => b.minPages)) : 8;
  const allMax = bs.length ? Math.max(...bs.map((b) => b.maxPages)) : 8;
  const pagesMin = Math.ceil(allMin / PAGE_STEP) * PAGE_STEP;
  const pagesMax = Math.floor(allMax / PAGE_STEP) * PAGE_STEP;
  const pages = Math.max(pagesMin, Math.min(pagesMax, 8));
  const fits = (b: { minPages: number; maxPages: number }) =>
    pages >= b.minPages && pages <= b.maxPages;
  const chosen = bs[0] && fits(bs[0]) ? bs[0] : bs.find(fits) ?? bs[0];

  const fmt = cfg.sizes[0];
  return {
    previewKind: cfg.previewKind,
    mm: fmt ? { w: fmt.width, h: fmt.height } : null,
    binding: bindingKindOf(chosen?.name),
    pages,
    ruling: cfg.rulingOptions[0]?.name ?? null,
    cover: cfg.coverPapers[0]?.colors?.[0]?.hex ?? COVER,
  };
}

export function coverTileSvg(input: CoverTileInput): string {
  const coverHex = input.cover ?? COVER;
  const ctx = new SvgContext(W, H);
  const c = ctx as unknown as CanvasRenderingContext2D;
  const scene = getCover(input.previewKind);

  const env: CoverEnv = {
    ink: inkColor(coverHex),
    cover: coverHex,
    foilOn: false,
    foilHex: "#d9b44a",
    binding: input.binding,
    pages: input.pages,
    ruling: input.ruling ?? null,
    mm: { w: input.mm?.w || 148, h: input.mm?.h || 210 },
  };

  // Изделие, которое физически НЕ книжка (газета), рисует себя целиком в обход
  // stage — общая сцена ему врёт не в деталях, а полностью.
  if (scene.render) {
    scene.render(c, W, H, env);
    return wrap(ctx);
  }

  const aspect = env.mm.w / env.mm.h;
  const fpad = Math.min(W, H) * 0.16;
  const availH = H - 2 * fpad, availW = W - 2 * fpad;
  let cw = availH * aspect, ch = availH;
  if (cw > availW) { cw = availW; ch = cw / aspect; }

  const m = Math.min(cw, ch);
  const hard = input.binding === "hardcover";
  const rings = scene.features?.rings === true && input.binding === "spiral";
  // Толщина блока. У 7БЦ задаём МИНИМУМ, которого нет в живом превью: там объём
  // корешка держит тень, а плитка её не рисует, и по формуле живого stage корешок
  // выходил ~2 px — твёрдый переплёт становился неотличим от мягкого. А это
  // единственный видимый признак премиального переплёта у фотокниги и
  // выпускного альбома. Тот же принцип, что и в откате «угла обзора»: на
  // плитке узнаваемость силуэта важнее правдоподобия пропорции.
  const rawThickness = Math.min(cw * 0.1, 3 + input.pages * 0.12);
  const thickness = hard ? Math.max(rawThickness, m * 0.13) : rawThickness;
  const coilW = input.binding === "spiral" ? Math.max(6, cw * 0.06) : 0;
  // Твёрдый переплёт: слева объёмный корешок, поэтому обложку сдвигаем вправо.
  const x = (W - cw - thickness) / 2 + coilW / 2 + (hard ? thickness : 0);
  const y = (H - ch) / 2;
  const rad = hard ? m * 0.02 : m * 0.03;

  if (hard) {
    // Объёмный корешок 7БЦ: узкая грань слева. Выпуклость выше, чем в живом
    // превью (0.45): наружу из-под обложки торчит именно она, и на плитке от
    // неё зависит, прочитается переплёт твёрдым или нет. Выше 0.7 обложка уже
    // начинает читаться «пузырём» — там граница.
    const bulge = thickness * 0.7;
    const spinePath = () => {
      c.beginPath();
      c.moveTo(x, y - m * 0.012);
      c.quadraticCurveTo(x - bulge, y + ch / 2, x, y + ch + m * 0.012);
      c.lineTo(x + thickness, y + ch + m * 0.012);
      c.lineTo(x + thickness, y - m * 0.012);
      c.closePath();
    };
    spinePath();
    c.fillStyle = coverHex;
    c.fill();
    const sg = c.createLinearGradient(x - bulge, 0, x + thickness, 0);
    sg.addColorStop(0, "rgba(0,0,0,.42)");
    sg.addColorStop(0.45, "rgba(0,0,0,.12)");
    sg.addColorStop(0.8, "rgba(255,255,255,.06)");
    sg.addColorStop(1, "rgba(0,0,0,.3)"); // штроба: линия сгиба у корешка
    spinePath();
    c.fillStyle = sg;
    c.fill();

    // Блок утоплен под кант обложки — виден узкой каймой среза справа/снизу.
    const inset = m * 0.02;
    c.fillStyle = "#f4f1ea";
    roundRect(c, x + inset, y + inset, cw - inset, ch - 2 * inset, rad * 0.5);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.12)";
    c.lineWidth = 1;
    roundRect(c, x + inset, y + inset, cw - inset, ch - 2 * inset, rad * 0.5);
    c.stroke();
  } else {
    // Стопка страниц — намёк на толщину блока.
    for (let i = Math.ceil(thickness / 2); i > 0; i--) {
      const off = i * 1.5;
      roundRect(c, x + off, y + off, cw, ch, rad);
      c.fillStyle = i % 2 ? "#f7f5f0" : "#eceae4";
      c.fill();
    }
  }

  // Обложка. У твёрдой она чуть больше блока (кант).
  const coverRect: Rect = hard
    ? { x: x - m * 0.012, y: y - m * 0.012, w: cw + m * 0.012, h: ch + m * 0.024 }
    : { x, y, w: cw, h: ch };
  roundRect(c, coverRect.x, coverRect.y, coverRect.w, coverRect.h, rad);
  c.fillStyle = coverHex;
  c.fill();

  c.save();
  roundRect(c, coverRect.x, coverRect.y, coverRect.w, coverRect.h, rad);
  c.clip();

  // затенение у корешка (слева) — даёт изгиб страницы
  const spineW = cw * (input.binding === "glue" || hard ? 0.1 : 0.06);
  const spine = c.createLinearGradient(coverRect.x, 0, coverRect.x + spineW, 0);
  spine.addColorStop(0, "rgba(0,0,0,.2)");
  spine.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = spine;
  c.fillRect(coverRect.x, coverRect.y, spineW, coverRect.h);

  // «Кукла» обложки — только ink; поле под спираль не занимаем
  const contentRect: Rect = {
    x: coverRect.x + coilW, y: coverRect.y,
    w: coverRect.w - coilW, h: coverRect.h,
  };
  scene.content(c, contentRect, env);
  c.restore();

  // контур обложки
  roundRect(c, coverRect.x, coverRect.y, coverRect.w, coverRect.h, rad);
  c.lineWidth = 1;
  c.strokeStyle = "rgba(0,0,0,.15)";
  c.stroke();

  drawBinding(c, input.binding, x, y, ch, coilW, rings, hard);
  if (scene.features?.strap) drawStrap(c, coverRect, m);

  return wrap(ctx);
}

// Переплёт. `rings` — кольцевой механизм вместо спирали (тетради на кольцах):
// та же пружина по цене, но узнаётся иначе.
function drawBinding(
  ctx: CanvasRenderingContext2D, kind: BindingKind,
  x: number, y: number, ch: number, coilW: number,
  rings: boolean, hard: boolean,
) {
  if (kind === "spiral" && rings) {
    ctx.lineWidth = Math.max(2, coilW * 0.24);
    for (let i = 0; i < 3; i++) {
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
  // hardcover — объёмный корешок нарисован выше, добавлять нечего
}

// Резинка-ремешок и ляссе — признак ежедневника.
function drawStrap(ctx: CanvasRenderingContext2D, r: Rect, m: number) {
  const sw = Math.max(3, m * 0.028);
  const sx = r.x + r.w * 0.84;
  const g = ctx.createLinearGradient(sx, 0, sx + sw, 0);
  g.addColorStop(0, "rgba(30,28,26,.95)");
  g.addColorStop(0.4, "rgba(78,74,68,.95)");
  g.addColorStop(1, "rgba(24,22,20,.95)");
  ctx.fillStyle = g;
  ctx.fillRect(sx, r.y - m * 0.01, sw, r.h + m * 0.02);

  // ляссе — лента из блока снизу
  const lw = Math.max(2, m * 0.018);
  const lx = r.x + r.w * 0.3;
  ctx.fillStyle = "rgba(150,40,45,.9)";
  ctx.fillRect(lx, r.y + r.h - m * 0.02, lw, m * 0.12);
  ctx.beginPath();
  ctx.moveTo(lx, r.y + r.h + m * 0.1);
  ctx.lineTo(lx + lw / 2, r.y + r.h + m * 0.07);
  ctx.lineTo(lx + lw, r.y + r.h + m * 0.1);
  ctx.closePath();
  ctx.fillStyle = "rgba(120,32,36,.9)";
  ctx.fill();
}

const wrap = (ctx: SvgContext) =>
  `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="product-tile__svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${ctx.toSVG()}</svg>`;
