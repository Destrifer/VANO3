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

// Текст металлической фольгой (градиент из hex + блик). Переиспользуется макетами.
export function drawFoilText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, size: number,
  align: CanvasTextAlign, hex: string,
  fontFamily = "Georgia, serif",
) {
  const c = hexToRgb(hex);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, scale(c, 0.45));
  g.addColorStop(0.42, hex);
  g.addColorStop(0.5, toWhite(c, 0.75));
  g.addColorStop(0.58, hex);
  g.addColorStop(1, scale(c, 0.45));

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
