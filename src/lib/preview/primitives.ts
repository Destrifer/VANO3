// Общие примитивы превью (чистые функции над canvas-контекстом).
// Переиспользуются всеми макетами продуктов; геометрия и материя — здесь.

export type Rect = { x: number; y: number; w: number; h: number };

// — геометрия —
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type ShapeKind = "rectangular" | "round" | "complex";

// Фигурная вырубка: лепестковый контур вместо прямоугольника. Конкретного
// контура у неё нет — макет присылает клиент, — но показывать «сложную форму»
// прямоугольником нельзя: до этого шесть продуктов (визитки, наклейки,
// этикетки, трафареты, объёмные наклейки, открытки) предлагали вырубку, а
// превью рисовало ровно то же, что и без неё.
// Основа — СУПЕРЭЛЛИПС, а не эллипс: эллипс, вписанный в лист, отрезает углы
// почти наполовину, и «кукла» на вырубленной визитке теряла монограмму и имя.
// Суперэллипс заполняет лист почти целиком, оставаясь скруглённым, а лепестки
// поверх него читаются как фигурный рез.
function complexPath(ctx: CanvasRenderingContext2D, r: Rect) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const rx = r.w / 2, ry = r.h / 2;
  const p = 2 / 3.6; // показатель суперэллипса: 1 — ромб, 0 — прямоугольник
  const N = 240;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const k = 0.94 + 0.06 * Math.cos(6 * t); // шесть мягких лепестков
    const px = cx + Math.sign(c) * Math.abs(c) ** p * rx * k;
    const py = cy + Math.sign(s) * Math.abs(s) ** p * ry * k;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// Контур карточки. Позже сюда же — Path2D из SVG-пути реальной вырубки клиента.
export function shapePath(
  ctx: CanvasRenderingContext2D, r: Rect, radius: number, shape: ShapeKind,
) {
  if (shape === "round") {
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shape === "complex") {
    complexPath(ctx, r);
  } else {
    roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  }
}

// — ВЫРУБНЫЕ ОТВЕРСТИЯ (сверление, еврослот, люверс) —
// Общий примитив: дырка в бирке, в бейдже и в ценнике обязана выглядеть
// одинаково. Настоящей прозрачности здесь нет — что под изделием, движок не
// знает, — поэтому «сквозь» изображаем приглушённой заливкой плюс тёмный кант
// реза: именно кант и читается как отверстие.
export function punchHole(ctx: CanvasRenderingContext2D, path: () => void, u: number) {
  ctx.save();
  path();
  ctx.fillStyle = "rgba(120,126,134,0.28)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.lineWidth = Math.max(1, u * 0.008);
  ctx.stroke();
  ctx.restore();
}

// Сверление: 1 отверстие — подвес по центру, 2 и 4 — под скоросшиватель,
// то есть в ряд вдоль ЛЕВОГО края (так их и сверлят под папку).
export function drillHoles(ctx: CanvasRenderingContext2D, r: Rect, count: number) {
  const u = Math.min(r.w, r.h);
  const rad = u * 0.045;
  if (count <= 1) {
    punchHole(ctx, () => {
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + u * 0.11, rad, 0, Math.PI * 2);
    }, u);
    return;
  }
  const x = r.x + u * 0.1;
  for (let i = 0; i < count; i++) {
    const cy = r.y + r.h * ((i + 1) / (count + 1));
    punchHole(ctx, () => {
      ctx.beginPath();
      ctx.arc(x, cy, rad, 0, Math.PI * 2);
    }, u);
  }
}

// Еврослот — подвес под торговый крючок. «Стандартный» — замочная скважина
// (круг + прорезь), «Суперслот» — широкая скруглённая прорезь; это два разных
// варианта в каталоге, и разными они обязаны быть и в превью.
export function euroSlot(ctx: CanvasRenderingContext2D, r: Rect, superSlot: boolean) {
  const u = Math.min(r.w, r.h);
  const cx = r.x + r.w / 2;
  if (superSlot) {
    const w = u * 0.3, h = u * 0.075;
    punchHole(ctx, () => roundRect(ctx, cx - w / 2, r.y + u * 0.08, w, h, h / 2), u);
    return;
  }
  const rad = u * 0.05;
  const cy = r.y + u * 0.13;
  punchHole(ctx, () => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.rect(cx - rad * 0.45, r.y + u * 0.05, rad * 0.9, cy - r.y - u * 0.05);
  }, u);
}

// — цвет-утилиты —
export function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const v = parseInt(n, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const rgb = (r: number, g: number, b: number) => `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
const scale = (c: { r: number; g: number; b: number }, k: number) => rgb(c.r * k, c.g * k, c.b * k);
const toWhite = (c: { r: number; g: number; b: number }, t: number) =>
  rgb(c.r + (255 - c.r) * t, c.g + (255 - c.g) * t, c.b + (255 - c.b) * t);

// Краска печати — тёмная/светлая по яркости бумаги.
export function inkColor(hex: string) {
  const c = hexToRgb(hex);
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return lum > 150 ? "#1c1917" : "#f5f5f4";
}

// — материя —
function makeNoise(w: number, h: number, intensity: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const x = c.getContext("2d")!;
  const id = x.createImageData(c.width, c.height);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (Math.random() * 2 - 1) * intensity;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  return c;
}

// Текстура волокон бумаги (грубее без ламинации).
export function paperTexture(ctx: CanvasRenderingContext2D, r: Rect, intensity: number, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(makeNoise(Math.round(r.w), Math.round(r.h), intensity), r.x, r.y);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = alpha * 0.5;
  const fibers = Math.round((r.w * r.h) / 900);
  for (let i = 0; i < fibers; i++) {
    const fx = r.x + Math.random() * r.w, fy = r.y + Math.random() * r.h;
    ctx.strokeStyle = Math.random() > 0.5 ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.3)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + (Math.random() * 6 - 3), fy + (Math.random() * 2 - 1));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// Глянец ламинации: мягкая засветка + резкая диагональная полоса.
export function laminationGloss(ctx: CanvasRenderingContext2D, r: Rect, strength: number) {
  const soft = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  soft.addColorStop(0, `rgba(255,255,255,${0.22 * strength})`);
  soft.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = soft;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.translate(r.x + r.w * 0.35, r.y);
  ctx.rotate(0.5);
  const band = ctx.createLinearGradient(-r.w * 0.12, 0, r.w * 0.12, 0);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, `rgba(255,255,255,${0.55 * strength})`);
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-r.w * 0.12, -r.h * 0.3, r.w * 0.24, r.h + r.h * 0.6);
  ctx.restore();
}

// Вырубное окно в обложке: кант по периметру + тень внутрь, чтобы читалась
// толщина картона. Общий механизм (как drawFoilText): окно фотокниги и окно
// выпускного альбома обязаны выглядеть одинаково.
export function dieCutWindow(ctx: CanvasRenderingContext2D, r: Rect, depth: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const top = ctx.createLinearGradient(0, r.y, 0, r.y + depth);
  top.addColorStop(0, "rgba(0,0,0,.4)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(r.x, r.y, r.w, depth);
  const left = ctx.createLinearGradient(r.x, 0, r.x + depth, 0);
  left.addColorStop(0, "rgba(0,0,0,.3)");
  left.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = left;
  ctx.fillRect(r.x, r.y, depth, r.h);
  const bottom = ctx.createLinearGradient(0, r.y + r.h - depth, 0, r.y + r.h);
  bottom.addColorStop(0, "rgba(255,255,255,0)");
  bottom.addColorStop(1, "rgba(255,255,255,.22)");
  ctx.fillStyle = bottom;
  ctx.fillRect(r.x, r.y + r.h - depth, r.w, depth);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = Math.max(1, depth * 0.25);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// — АКЦЕНТ: фольга, выборочный УФ-лак, конгрев, объёмный 3D-лак —
// Сцена объявляет ОДИН раз, где на кукле лежит декорируемый элемент (лого,
// заголовок, плашка) — `AccentMark`. Все четыре отделки украшают именно его,
// поэтому объявление одно, а отрисовок четыре, и все живут здесь.
//
// Как это ломалось: фольгу рисовал метод в КАЖДОЙ сцене — из 26 её написали 14,
// и на бейджах, буклетах, открытках, билетах и POS-материалах галочка
// «фольгирование» не давала в превью ровно ничего.
//
// Разница отделок по существу: фольга ЗАМЕНЯЕТ краску металлом (поэтому сцены
// не печатают ink под ней), а лак и конгрев работают ПОВЕРХ краски — она
// остаётся видна, меняется только рельеф и блеск.
export type AccentMark =
  | {
      kind: "text";
      text: string;
      x: number; y: number; // y — ВЕРХ строки (textBaseline: top)
      size: number;
      align?: CanvasTextAlign;
      font?: string;
    }
  | { kind: "rect"; x: number; y: number; w: number; h: number; radius?: number };

// Раскладка металла по градиенту: тень → цвет → пересвет → цвет → тень.
// Отдельно от создания градиента, потому что 3D-вид сложенного буклета кладёт
// фольгу вдоль перспективной кромки — ось у него своя, а металл обязан быть тот
// же (иначе фольга на буклете отличается от фольги на всём остальном).
export function applyFoilStops(g: CanvasGradient, hex: string) {
  const c = hexToRgb(hex);
  g.addColorStop(0, scale(c, 0.45));
  g.addColorStop(0.42, hex);
  g.addColorStop(0.5, toWhite(c, 0.75));
  g.addColorStop(0.58, hex);
  g.addColorStop(1, scale(c, 0.45));
  return g;
}

// Вертикальный металлический градиент под метку.
function foilFill(ctx: CanvasRenderingContext2D, hex: string, top: number, height: number) {
  return applyFoilStops(ctx.createLinearGradient(0, top, 0, top + height), hex);
}

// Плашка фольгой (полоса, кант, залитая фигура) — для сцен, где фольгируется не
// текст. Тот же металл, что у drawFoilText, чтобы вид не разъезжался.
function drawFoilRect(
  ctx: CanvasRenderingContext2D,
  m: Extract<AccentMark, { kind: "rect" }>,
  hex: string,
) {
  const rad = m.radius ?? 0;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = foilFill(ctx, hex, m.y, m.h);
  roundRect(ctx, m.x, m.y, m.w, m.h, rad);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const hi = ctx.createLinearGradient(m.x, 0, m.x + m.w, 0);
  hi.addColorStop(0, "rgba(255,255,255,0)");
  hi.addColorStop(0.5, "rgba(255,255,255,.7)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hi;
  roundRect(ctx, m.x, m.y, m.w, m.h, rad);
  ctx.fill();
  ctx.restore();
}

// Фолбэк, когда сцена меток не объявила. Существует ровно затем, чтобы галочка
// «фольгирование» НИКОГДА не была немой: на 5 опубликованных продуктах она
// молчала именно потому, что сцена просто не написала свою реализацию.
// Монограмма в углу (у круглого — по центру сверху) — самая частая конвенция
// среди сцен, которые фольгу объявляют.
export function defaultAccentMarks(r: Rect, round: boolean): AccentMark[] {
  const u = Math.min(r.w, r.h);
  const size = Math.round(u * 0.16);
  return [{
    kind: "text", text: "PM", size,
    x: round ? r.x + r.w / 2 : r.x + u * 0.1,
    y: r.y + u * 0.1,
    align: round ? "center" : "left",
  }];
}

// Единственная точка входа движка для ФОЛЬГИ: список меток → металл на канвасе.
export function drawAccentMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly AccentMark[],
  hex: string,
) {
  for (const m of marks) {
    if (m.kind === "text") {
      drawFoilText(ctx, m.text, m.x, m.y, m.size, m.align ?? "left", hex, m.font);
    } else {
      drawFoilRect(ctx, m, hex);
    }
  }
}

// Залить метку заданным стилем, опц. со сдвигом. Ключевой приём для лака и
// конгрева: метку ПЕРЕРИСОВЫВАЕМ той же формой, а не накрываем прямоугольной
// плашкой — тогда глянец и рельеф повторяют буквы, а не бокс вокруг них.
function paintMark(
  ctx: CanvasRenderingContext2D,
  m: AccentMark,
  fill: string | CanvasGradient,
  dx = 0, dy = 0,
) {
  ctx.fillStyle = fill;
  if (m.kind === "text") {
    ctx.textAlign = m.align ?? "left";
    ctx.textBaseline = "top";
    ctx.font = `700 ${m.size}px ${m.font ?? "Georgia, serif"}`;
    ctx.fillText(m.text, m.x + dx, m.y + dy);
  } else {
    roundRect(ctx, m.x + dx, m.y + dy, m.w, m.h, m.radius ?? 0);
    ctx.fill();
  }
}

// Габарит метки — нужен, чтобы задать ось градиента блика. У текста ширину
// приходится мерить: она зависит от шрифта и выравнивания.
function markBox(ctx: CanvasRenderingContext2D, m: AccentMark): Rect {
  if (m.kind === "rect") return { x: m.x, y: m.y, w: m.w, h: m.h };
  ctx.save();
  ctx.font = `700 ${m.size}px ${m.font ?? "Georgia, serif"}`;
  const w = ctx.measureText(m.text).width;
  ctx.restore();
  const align = m.align ?? "left";
  const x = align === "center" ? m.x - w / 2 : align === "right" ? m.x - w : m.x;
  return { x, y: m.y, w, h: m.size };
}

// Толщина рельефа: конгрев продавливает бумагу, 3D-лак наращивает слой поверх —
// второй заметно выше, отсюда множитель.
// Сдвиг намеренно МАЛЕНЬКИЙ. При заметном (пробовали 0.07 кегля) светлая и
// тёмная копии расходятся настолько, что буква читается не как рельефная, а как
// расфокусированная и потерявшая краску: на превью в 300 px рельеф — это
// один-два пикселя канта, не больше.
const markDepth = (m: AccentMark, k: number) =>
  Math.max(1, (m.kind === "text" ? m.size : m.h) * 0.028 * k);

// Выборочный УФ-лак: прозрачный глянец ТОЛЬКО по акценту. Режим `screen` —
// лак не красит, а добавляет блеск: краска под ним обязана остаться видимой.
export function drawUvGloss(
  ctx: CanvasRenderingContext2D,
  marks: readonly AccentMark[],
  strength = 1,
) {
  for (const m of marks) {
    const b = markBox(ctx, m);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.38, `rgba(255,255,255,${0.5 * strength})`);
    g.addColorStop(0.5, `rgba(255,255,255,${0.85 * strength})`);
    g.addColorStop(0.62, `rgba(255,255,255,${0.5 * strength})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    paintMark(ctx, m, g);
    ctx.restore();
  }
}

// Конгрев: рельефное тиснение. Светлая копия со сдвигом вверх-влево и тёмная
// вниз-вправо — свет падает сверху-слева, как и во всех прочих слоях движка
// (тень ламинации, купол смолы), иначе рельеф спорит с ними и читается плоско.
export function drawEmboss(
  ctx: CanvasRenderingContext2D,
  marks: readonly AccentMark[],
  k = 1,
) {
  for (const m of marks) {
    const d = markDepth(m, k);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    paintMark(ctx, m, "rgba(255,255,255,0.62)", -d, -d);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    paintMark(ctx, m, "rgba(70,64,56,0.45)", d, d);
    ctx.restore();
  }
}

// Объёмный 3D-лак: тот же рельеф, но выше, и обязательно с влажным блеском —
// это толстая капля лака поверх краски, а не продавленная бумага.
export function drawRaisedVarnish(
  ctx: CanvasRenderingContext2D,
  marks: readonly AccentMark[],
) {
  drawEmboss(ctx, marks, 1.8);
  drawUvGloss(ctx, marks, 1.15);
}

// Текст металлической фольгой (градиент из hex + блик). Переиспользуется макетами.
export function drawFoilText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, size: number,
  align: CanvasTextAlign, hex: string,
  fontFamily = "Georgia, serif",
) {
  const g = foilFill(ctx, hex, y, size);

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.font = `700 ${size}px ${fontFamily}`;
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.font = `700 ${size}px ${fontFamily}`;
  const hi = align === "center"
    ? ctx.createLinearGradient(x - size, 0, x + size, 0)
    : ctx.createLinearGradient(x, 0, x + size * 1.4, 0);
  hi.addColorStop(0, "rgba(255,255,255,0)");
  hi.addColorStop(0.5, "rgba(255,255,255,.85)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hi;
  ctx.fillText(text, x, y);
  ctx.restore();
}
