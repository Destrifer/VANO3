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

// Контур карточки. Позже сюда же — Path2D из SVG-пути сложной вырубки.
export function shapePath(ctx: CanvasRenderingContext2D, r: Rect, radius: number, round: boolean) {
  if (round) {
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else {
    roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  }
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

// — ФОЛЬГА —
// Как БЛЕСТИТ металл, знает только этот файл. Сцена объявляет, ГДЕ на кукле
// лежит фольга (`FoilMark`), рисует движок — иначе каждая сцена шьёт себе свою
// фольгу, что и произошло: из 26 сцен `foil()` написали 14, и на бейджах,
// буклетах, открытках, билетах и POS-материалах галочка «фольгирование» в
// калькуляторе не давала в превью ровно ничего.
export type FoilMark =
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
  m: Extract<FoilMark, { kind: "rect" }>,
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
export function defaultFoilMarks(r: Rect, round: boolean): FoilMark[] {
  const u = Math.min(r.w, r.h);
  const size = Math.round(u * 0.16);
  return [{
    kind: "text", text: "PM", size,
    x: round ? r.x + r.w / 2 : r.x + u * 0.1,
    y: r.y + u * 0.1,
    align: round ? "center" : "left",
  }];
}

// Единственная точка входа для движка: список меток → металл на канвасе.
export function drawFoilMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly FoilMark[],
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
