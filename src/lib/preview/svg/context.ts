// Адаптер «canvas-вызовы → SVG». Поддельный CanvasRenderingContext2D, который
// вместо рисования на растр КОПИТ вызовы и отдаёт строку <svg>. Существует затем,
// чтобы плитки каталога рисовались теми же сценами `mockups.ts`, что и живое
// превью (инвариант 1: одна реализация макета, а не вторая под SVG), но на
// СБОРКЕ — вектор, ноль запросов, ноль JS на клиенте.
//
// Покрыто ровно то подмножество API, которое используют листовые сцены
// (`content()`): пути, заливки/обводки, текст, пунктир, скругления (arcTo),
// линейный/радиальный градиент, трансформы (translate/rotate/scale), clip,
// measureText (аппроксимация). Шум-текстуры и composite-режимы плитке не нужны —
// их сюда сознательно не тащим.

type Mat = [number, number, number, number, number, number]; // a,b,c,d,e,f

const IDENT: Mat = [1, 0, 0, 1, 0, 0];

const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const apply = (m: Mat, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

// Средний масштаб матрицы — для радиусов/толщин, где anisotropy можно пренебречь.
const avgScale = (m: Mat) =>
  (Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3])) / 2;

const n2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

type Grad = {
  __grad: "linear" | "radial";
  id: string;
  stops: { off: number; color: string }[];
  coords: number[]; // device-space координаты (уже под матрицей создания)
  addColorStop(off: number, color: string): void;
};

type State = {
  m: Mat;
  fill: string | Grad;
  stroke: string | Grad;
  lineWidth: number;
  alpha: number;
  dash: number[];
  font: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  clip: string | null; // id активного clipPath
};

const cloneState = (s: State): State => ({ ...s, m: [...s.m] as Mat, dash: [...s.dash] });

// Разбор CSS-шортката шрифта, который пишут сцены: «700 18px Georgia, serif».
function parseFont(font: string) {
  const m = /^\s*(\d+)?\s*(\d+(?:\.\d+)?)px\s+(.+)$/.exec(font);
  return {
    weight: m?.[1] ?? "400",
    size: m ? parseFloat(m[2]) : 12,
    family: m?.[3] ?? "sans-serif",
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// — МОНОХРОМ —
// Сцены рисуют «бумажную» картинку: кремовая основа, тёмная краска, цветное фото
// на обложке. В плитке каталога это выглядело чужеродно — страница у нас
// нео-нуар, и бежевое читалось как «старое». Поэтому здесь любой цвет сцены
// сводится к ОДНОЙ оси «сколько краски на белом».
//
// Ключевой приём: на белой бумаге «серый 50%» и «чёрный с alpha 0.5» выглядят
// одинаково, поэтому пару (яркость, альфа) можно свернуть в одно число — долю
// краски. Отдаём её через `var(--color-base-content)`, а не хардкодом: плитка
// становится темозависимой и на тёмной теме перевернётся сама.
function parseColor(css: string): { r: number; g: number; b: number; a: number } | null {
  const s = css.trim();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    if (n.length !== 6) return null;
    const v = parseInt(n, 16);
    if (Number.isNaN(v)) return null;
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 1 };
  }
  const m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x));
  if (p.length < 3 || p.some((x) => Number.isNaN(x))) return null;
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

// Доля краски 0..1. null — цвет не разобран или это уже CSS-переменная/url:
// такие пропускаем как есть (ими stage задаёт бумагу и акцент осознанно).
function inkLevel(css: string): number | null {
  if (!css || css.startsWith("var(") || css.startsWith("url(") || css === "none") return null;
  const c = parseColor(css);
  if (!c) return null;
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return Math.max(0, Math.min(1, c.a * (1 - lum)));
}

const inkPaint = (ink: number) =>
  ink <= 0.01 ? "transparent"
    : ink >= 0.99 ? "var(--color-base-content)"
      : `color-mix(in oklch, var(--color-base-content) ${Math.round(ink * 100)}%, transparent)`;

export class SvgContext {
  private out: string[] = [];
  private defs: string[] = [];
  private s: State;
  private stack: State[] = [];
  private path = ""; // текущий путь в DEVICE-координатах
  // Текущую и стартовую точку держим в ЛОКАЛЬНЫХ координатах: так arcTo (общий
  // roundRect) считает касательную окружность без инверсии матрицы, а в device
  // переводим только на выводе.
  private curLocal: [number, number] | null = null;
  private startLocal: [number, number] | null = null;
  private gid = 0;
  private cid = 0;
  // Габарит текущего пути в device-координатах: хафтон ставим только на КРУПНЫЕ
  // заливки, иначе тонкие линии-«рыба» рассыпаются в пунктир и читаются грязью.
  private bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private halftones = new Set<number>();

  constructor(private W: number, private H: number, private opts: { halftone?: boolean } = {}) {
    this.s = {
      m: [...IDENT] as Mat,
      fill: "#000",
      stroke: "#000",
      lineWidth: 1,
      alpha: 1,
      dash: [],
      font: "10px sans-serif",
      align: "left",
      baseline: "alphabetic",
      clip: null,
    };
  }

  // — состояние —
  save() { this.stack.push(cloneState(this.s)); }
  restore() { const p = this.stack.pop(); if (p) this.s = p; }

  set fillStyle(v: string | Grad) { this.s.fill = v; }
  get fillStyle() { return this.s.fill; }
  set strokeStyle(v: string | Grad) { this.s.stroke = v; }
  get strokeStyle() { return this.s.stroke; }
  set lineWidth(v: number) { this.s.lineWidth = v; }
  get lineWidth() { return this.s.lineWidth; }
  set globalAlpha(v: number) { this.s.alpha = v; }
  get globalAlpha() { return this.s.alpha; }
  set font(v: string) { this.s.font = v; }
  get font() { return this.s.font; }
  set textAlign(v: CanvasTextAlign) { this.s.align = v; }
  get textAlign() { return this.s.align; }
  set textBaseline(v: CanvasTextBaseline) { this.s.baseline = v; }
  get textBaseline() { return this.s.baseline; }

  // Тени и composite плитке не нужны — принимаем и игнорируем, чтобы сцена не падала.
  set shadowColor(_v: string) {}
  set shadowBlur(_v: number) {}
  set shadowOffsetX(_v: number) {}
  set shadowOffsetY(_v: number) {}
  set globalCompositeOperation(_v: string) {}
  set lineCap(_v: string) {}
  set lineJoin(_v: string) {}

  setLineDash(d: number[]) { this.s.dash = d.slice(); }
  getLineDash() { return this.s.dash.slice(); }

  // — трансформы (canvas post-multiply: локальные оси) —
  translate(x: number, y: number) { this.s.m = mul(this.s.m, [1, 0, 0, 1, x, y]); }
  scale(x: number, y: number) { this.s.m = mul(this.s.m, [x, 0, 0, y, 0, 0]); }
  rotate(a: number) {
    const c = Math.cos(a), s = Math.sin(a);
    this.s.m = mul(this.s.m, [c, s, -s, c, 0, 0]);
  }

  // — построение пути (координаты локальные, в device переводим на выводе) —
  beginPath() {
    this.path = ""; this.curLocal = null; this.startLocal = null;
    this.bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  }
  private grow(px: number, py: number) {
    const b = this.bb;
    if (px < b.x0) b.x0 = px;
    if (py < b.y0) b.y0 = py;
    if (px > b.x1) b.x1 = px;
    if (py > b.y1) b.y1 = py;
  }
  moveTo(x: number, y: number) {
    const [px, py] = apply(this.s.m, x, y);
    this.path += `M${n2(px)} ${n2(py)}`;
    this.grow(px, py);
    this.curLocal = [x, y]; this.startLocal = [x, y];
  }
  lineTo(x: number, y: number) {
    if (!this.curLocal) { this.moveTo(x, y); return; }
    const [px, py] = apply(this.s.m, x, y);
    this.path += `L${n2(px)} ${n2(py)}`;
    this.grow(px, py);
    this.curLocal = [x, y];
  }
  closePath() {
    this.path += "Z";
    if (this.startLocal) this.curLocal = [...this.startLocal] as [number, number];
  }

  // Безье переводим точками, а не сэмплом: аффинное преобразование сохраняет
  // кривую, поэтому достаточно перевести контрольные точки. Нужен выпуклому
  // корешку 7БЦ (BookletPreview) и обложкам covers.ts.
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    if (!this.curLocal) this.moveTo(cx, cy);
    const [pcx, pcy] = apply(this.s.m, cx, cy);
    const [px, py] = apply(this.s.m, x, y);
    this.path += `Q${n2(pcx)} ${n2(pcy)} ${n2(px)} ${n2(py)}`;
    this.grow(pcx, pcy); this.grow(px, py);
    this.curLocal = [x, y];
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    if (!this.curLocal) this.moveTo(c1x, c1y);
    const [a1, b1] = apply(this.s.m, c1x, c1y);
    const [a2, b2] = apply(this.s.m, c2x, c2y);
    const [px, py] = apply(this.s.m, x, y);
    this.path += `C${n2(a1)} ${n2(b1)} ${n2(a2)} ${n2(b2)} ${n2(px)} ${n2(py)}`;
    this.grow(a1, b1); this.grow(a2, b2); this.grow(px, py);
    this.curLocal = [x, y];
  }

  rect(x: number, y: number, w: number, h: number) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h);
    this.lineTo(x, y + h); this.closePath();
  }

  // arc/ellipse сэмплируем в ломаную (в локальных координатах) — так любой
  // поворот и неравномерный масштаб (softOval у купола смолы) выходят верно без
  // матана с эллиптическими дугами SVG.
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number,
          a0: number, a1: number, ccw = false) {
    const steps = Math.max(12, Math.ceil(avgScale(this.s.m) * Math.max(rx, ry) / 3));
    let span = a1 - a0;
    if (ccw && span > 0) span -= Math.PI * 2;
    if (!ccw && span < 0) span += Math.PI * 2;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (span * i) / steps;
      const ex = rx * Math.cos(a), ey = ry * Math.sin(a);
      const lx = cx + ex * cr - ey * sr;
      const ly = cy + ex * sr + ey * cr;
      i === 0 && !this.curLocal ? this.moveTo(lx, ly) : this.lineTo(lx, ly);
    }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false) {
    this.ellipse(cx, cy, r, r, 0, a0, a1, ccw);
  }

  // arcTo — им пользуется общий roundRect. Стандартная геометрия касательной
  // окружности, затем сэмпл дуги. Всё в локальных координатах.
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
    if (!this.curLocal) { this.moveTo(x1, y1); return; }
    const [x0, y0] = this.curLocal;
    const a = [x0 - x1, y0 - y1], b = [x2 - x1, y2 - y1];
    const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
    if (la < 1e-6 || lb < 1e-6 || r < 1e-6) { this.lineTo(x1, y1); return; }
    const ua = [a[0] / la, a[1] / la], ub = [b[0] / lb, b[1] / lb];
    const cosT = ua[0] * ub[0] + ua[1] * ub[1];
    const ang = Math.acos(Math.max(-1, Math.min(1, cosT)));
    if (ang < 1e-6 || ang > Math.PI - 1e-6) { this.lineTo(x1, y1); return; }
    const dist = r / Math.tan(ang / 2);
    const t1 = [x1 + ua[0] * dist, y1 + ua[1] * dist]; // касание на входящей линии
    const t2 = [x1 + ub[0] * dist, y1 + ub[1] * dist]; // касание на исходящей
    const bis = [ua[0] + ub[0], ua[1] + ub[1]];
    const lbis = Math.hypot(bis[0], bis[1]) || 1;
    const cd = r / Math.sin(ang / 2);
    const c = [x1 + (bis[0] / lbis) * cd, y1 + (bis[1] / lbis) * cd];
    this.lineTo(t1[0], t1[1]);
    const s0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const s1 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    let d = s1 - s0; // кратчайшая дуга
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const steps = Math.max(4, Math.ceil((avgScale(this.s.m) * r * Math.abs(d)) / 3));
    for (let i = 1; i <= steps; i++) {
      const ai = s0 + (d * i) / steps;
      this.lineTo(c[0] + r * Math.cos(ai), c[1] + r * Math.sin(ai));
    }
  }

  // — заливка/обводка —
  // Хафтон: крупную заливку средней «серости» заменяем точечным растром — тем
  // самым «печатным» видом. Плотность точки подбираем так, чтобы её площадь
  // относительно ячейки равнялась доле краски: тогда издалека пятно совпадает
  // по тону со сплошной заливкой, которую оно заменило.
  private halftoneRef(ink: number): string {
    const step = Math.max(1, Math.min(9, Math.round(ink * 10))); // бакеты по 10%
    this.halftones.add(step);
    return `url(#ht${step})`;
  }
  private useHalftone(ink: number) {
    if (!this.opts.halftone) return false;
    // только средние тона: светлее — точки не видно, темнее — сливается в плашку
    if (ink < 0.08 || ink > 0.62) return false;
    const b = this.bb;
    if (!Number.isFinite(b.x0)) return false;
    return b.x1 - b.x0 > 14 && b.y1 - b.y0 > 14;
  }

  private paint(kind: "fill" | "stroke") {
    if (!this.path) return;
    const style = kind === "fill" ? this.s.fill : this.s.stroke;
    const attrs: string[] = [`d="${this.path}"`];
    if (kind === "fill") {
      // Полная «краска» элемента = его цвет × globalAlpha. Считаем ОДИН раз и
      // кладём в fill, не разделяя на fill-opacity: иначе хафтон-точки получают
      // ещё и прозрачность сверху и тон уезжает вдвое.
      const lvl = typeof style === "string" ? inkLevel(style) : null;
      if (lvl !== null) {
        const ink = lvl * this.s.alpha;
        attrs.push(
          `fill="${this.useHalftone(ink) ? this.halftoneRef(ink) : inkPaint(ink)}"`,
          `stroke="none"`,
        );
      } else {
        attrs.push(`fill="${this.styleRef(style)}"`, `stroke="none"`);
        if (this.s.alpha < 1) attrs.push(`fill-opacity="${n2(this.s.alpha)}"`);
      }
    } else {
      const lw = this.s.lineWidth * avgScale(this.s.m);
      const lvl = typeof style === "string" ? inkLevel(style) : null;
      // Линии — всегда сплошные: точечная обводка на плитке читается как грязь.
      attrs.push(
        `fill="none"`,
        `stroke="${lvl !== null ? inkPaint(lvl * this.s.alpha) : this.styleRef(style)}"`,
        `stroke-width="${n2(lw)}"`,
      );
      if (lvl === null && this.s.alpha < 1) attrs.push(`stroke-opacity="${n2(this.s.alpha)}"`);
      if (this.s.dash.length) {
        attrs.push(`stroke-dasharray="${this.s.dash.map((d) => n2(d * avgScale(this.s.m))).join(" ")}"`);
      }
    }
    if (this.s.clip) attrs.push(`clip-path="url(#${this.s.clip})"`);
    this.out.push(`<path ${attrs.join(" ")}/>`);
  }
  fill() { this.paint("fill"); }
  stroke() { this.paint("stroke"); }

  // fillRect/strokeRect не трогают текущий путь (как в canvas) — сохраняем и
  // возвращаем его вокруг временного прямоугольника.
  private withTempPath(fn: () => void) {
    const p = this.path, cl = this.curLocal, sl = this.startLocal;
    this.beginPath(); fn();
    this.path = p; this.curLocal = cl; this.startLocal = sl;
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.withTempPath(() => { this.rect(x, y, w, h); this.fill(); });
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.withTempPath(() => { this.rect(x, y, w, h); this.stroke(); });
  }

  // — текст —
  fillText(text: string, x: number, y: number) {
    const f = parseFont(this.s.font);
    const [px, py] = apply(this.s.m, x, y);
    const sc = avgScale(this.s.m);
    const anchor = this.s.align === "center" ? "middle" : this.s.align === "right" ? "end" : "start";
    const dom = this.s.baseline === "top" ? "text-before-edge"
      : this.s.baseline === "middle" ? "central"
        : this.s.baseline === "bottom" ? "text-after-edge"
          : "alphabetic";
    const attrs = [
      `x="${n2(px)}"`, `y="${n2(py)}"`,
      `font-family="${esc(f.family)}"`,
      `font-size="${n2(f.size * sc)}"`,
      `font-weight="${f.weight}"`,
      `text-anchor="${anchor}"`,
      `dominant-baseline="${dom}"`,
    ];
    const lvl = typeof this.s.fill === "string" ? inkLevel(this.s.fill) : null;
    if (lvl !== null) {
      attrs.push(`fill="${inkPaint(lvl * this.s.alpha)}"`);
    } else {
      attrs.push(`fill="${this.styleRef(this.s.fill)}"`);
      if (this.s.alpha < 1) attrs.push(`fill-opacity="${n2(this.s.alpha)}"`);
    }
    if (this.s.clip) attrs.push(`clip-path="url(#${this.s.clip})"`);
    this.out.push(`<text ${attrs.join(" ")}>${esc(text)}</text>`);
  }

  strokeText(text: string, x: number, y: number) {
    const f = parseFont(this.s.font);
    const [px, py] = apply(this.s.m, x, y);
    const sc = avgScale(this.s.m);
    const anchor = this.s.align === "center" ? "middle" : this.s.align === "right" ? "end" : "start";
    const dom = this.s.baseline === "top" ? "text-before-edge"
      : this.s.baseline === "middle" ? "central"
        : this.s.baseline === "bottom" ? "text-after-edge"
          : "alphabetic";
    const attrs = [
      `x="${n2(px)}"`, `y="${n2(py)}"`,
      `font-family="${esc(f.family)}"`,
      `font-size="${n2(f.size * sc)}"`,
      `font-weight="${f.weight}"`,
      `text-anchor="${anchor}"`,
      `dominant-baseline="${dom}"`,
      `fill="none"`,
      `stroke="${this.styleRef(this.s.stroke)}"`,
      `stroke-width="${n2(this.s.lineWidth * sc)}"`,
    ];
    if (this.s.alpha < 1) attrs.push(`stroke-opacity="${n2(this.s.alpha)}"`);
    if (this.s.clip) attrs.push(`clip-path="url(#${this.s.clip})"`);
    this.out.push(`<text ${attrs.join(" ")}>${esc(text)}</text>`);
  }

  // Аппроксимация ширины: реального шрифта на сборке нет. 0.52·кегль на символ —
  // достаточно для fitFont ценника (подбор кегля вниз) и зачёркивания цены.
  measureText(text: string) {
    const f = parseFont(this.s.font);
    return { width: text.length * f.size * 0.52 * avgScale(this.s.m) } as TextMetrics;
  }

  // — clip: текущий путь → <clipPath>, применяется к последующим элементам —
  clip() {
    if (!this.path) return;
    const id = `c${this.cid++}`;
    this.defs.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`);
    this.s.clip = id;
  }

  // — градиенты —
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Grad {
    const [ax, ay] = apply(this.s.m, x0, y0);
    const [bx, by] = apply(this.s.m, x1, y1);
    return this.makeGrad("linear", [ax, ay, bx, by]);
  }
  createRadialGradient(x0: number, y0: number, _r0: number,
                       x1: number, y1: number, r1: number): Grad {
    const [fx, fy] = apply(this.s.m, x0, y0);
    const [cx, cy] = apply(this.s.m, x1, y1);
    // r0 (радиус фокуса) опускаем — приближение купола/бликов это терпит.
    return this.makeGrad("radial", [fx, fy, cx, cy, r1 * avgScale(this.s.m)]);
  }
  private makeGrad(kind: "linear" | "radial", coords: number[]): Grad {
    return {
      __grad: kind, id: `g${this.gid++}`, stops: [], coords,
      addColorStop(off: number, color: string) { this.stops.push({ off, color }); },
    };
  }
  private registered = new Set<string>();
  // Зарегистрировать градиент в defs (один раз на объект) и вернуть url(#id);
  // строку возвращает как есть.
  private styleRef(style: string | Grad): string {
    if (typeof style === "string") return style;
    if (this.registered.has(style.id)) return `url(#${style.id})`;
    this.registered.add(style.id);
    // Каждый стоп — на ту же ось «доля краски». Градиент тени корешка, неба на
    // обложке и купола смолы становится монохромным вместе со всем остальным.
    const stops = style.stops
      .map((s) => {
        const lvl = inkLevel(s.color);
        return `<stop offset="${n2(s.off)}" stop-color="${lvl !== null ? inkPaint(lvl) : s.color}"/>`;
      })
      .join("");
    if (style.__grad === "linear") {
      const [x1, y1, x2, y2] = style.coords;
      this.defs.push(
        `<linearGradient id="${style.id}" gradientUnits="userSpaceOnUse" x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}">${stops}</linearGradient>`,
      );
    } else {
      const [fx, fy, cx, cy, r] = style.coords;
      this.defs.push(
        `<radialGradient id="${style.id}" gradientUnits="userSpaceOnUse" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fx="${n2(fx)}" fy="${n2(fy)}">${stops}</radialGradient>`,
      );
    }
    return `url(#${style.id})`;
  }

  // — вывод —
  toSVG(): string {
    // Паттерны хафтона: ячейка 5×5, радиус точки из условия «площадь точки к
    // площади ячейки = доля краски» (πr² / 25 = ink) — тон пятна совпадает со
    // сплошной заливкой, которую хафтон заменил.
    const pats = [...this.halftones].map((step) => {
      const ink = step / 10;
      const r = Math.min(2.2, Math.sqrt((ink * 25) / Math.PI));
      return `<pattern id="ht${step}" width="5" height="5" patternUnits="userSpaceOnUse">` +
        `<circle cx="2.5" cy="2.5" r="${n2(r)}" fill="var(--color-base-content)"/></pattern>`;
    });
    const all = [...this.defs, ...pats];
    const defs = all.length ? `<defs>${all.join("")}</defs>` : "";
    return defs + this.out.join("");
  }
  get width() { return this.W; }
  get height() { return this.H; }
}
