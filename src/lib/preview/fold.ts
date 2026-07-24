// СЛОЖЕННОЕ ИЗДЕЛИЕ (буклеты): фронтальный симметричный 3D-вид вместо плоского
// листа. Живёт здесь, а не в `Preview.vue`, потому что рисуется в ДВУХ местах —
// в живом превью калькулятора и в плитке каталога (`svg/tile.ts`). Пока код
// сидел в компоненте, плитка буклетов рисовала плоский лист в одну панель и была
// неотличима от плитки «Документы»: обе сцены — `leaflet`, а единственное, что
// их различало, — фальцовка — до плитки не доезжало (инвариант 1: одна
// реализация макета на все места, где он показывается).
//
// Вид намеренно ФРОНТАЛЬНЫЙ: перспективу «сбоку сверху» пробовали и откатили —
// изделие переставало читаться с первого взгляда (см. 07-preview-mockups.md).
import { applyFoilStops } from "./primitives";

type Pt = { x: number; y: number };

export type FoldOpts = {
  /** число панелей = folds + 1 */
  panels: number;
  /** тип фальцовки из `fold_types[].kind`: roll заворачивает панели внутрь */
  kind: string;
  /** формат ЛИСТА в мм — задаёт пропорцию панели */
  sheet: { w: number; h: number };
  /** цвет бумаги */
  cover: string;
  /** цвет краски */
  ink: string;
  /** сила глянца ламинации (0 — без блика) */
  gloss?: number;
  /** фольга на заголовке первой панели */
  foil?: { on: boolean; hex: string } | null;
  /**
   * Сплошной цвет заголовка вместо фольги — им плитка каталога кладёт своё
   * единственное акцентное пятно (металлический градиент в монохроме плитки
   * схлопнулся бы в грязь).
   */
  accent?: string | null;
  /**
   * Обводка панелей. В живом превью объём держит ТЕНЬ, а SVG-адаптер плитки
   * теней не кладёт — без контура светлые панели на белой плитке исчезают.
   */
  outline?: string | null;
  /**
   * Множитель светотени. В цвете это мягкая тень на завёрнутых панелях, но в
   * монохроме плитки («сколько краски на белом») тень становится КРАСКОЙ: при
   * штатных 0.24–0.3 крайние панели уходили в сплошной хафтон и буклет читался
   * как чёрные крылья. Плитка гасит тень до доли, которая ниже порога хафтона.
   */
  shade?: number;
};

export function drawFolded(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  o: FoldOpts,
) {
  const panels = Math.max(1, o.panels);
  const cover = o.cover;
  const ink = o.ink;
  const gloss = o.gloss ?? 0;
  const pad = Math.min(cssW, cssH) * 0.14;
  const availW = cssW - 2 * pad;
  const availH = cssH - 2 * pad;
  const sheetW = o.sheet.w || 297;
  const sheetH = o.sheet.h || 210;

  const ph = 100;
  const pw = ph * ((sheetW / panels) / sheetH);
  const depth = ph * 0.12; // глубина зигзага

  // Геометрия панелей по типу фальцовки.
  // roll («Евро», «Улитка») — панели заворачиваются ВНУТРЬ одна в другую: наклон
  // растёт монотонно, каждая следующая панель уже предыдущей (на производстве её
  // и подрезают, иначе не вложится), вглубь рулона темнее.
  // accordion («Гармошка») и book («Книжка») — зигзаг: наклон чередуется.
  const raw: { c: Pt[]; shade: number }[] = [];
  const rolled = o.kind === "roll";
  // У рулонной угол должен читаться сильнее, чем у гармошки: там панели просто
  // качаются вокруг фронтальной плоскости, здесь крайние реально загнуты внутрь.
  const d = rolled ? depth * 2.4 : depth;
  let lx = 0;
  for (let i = 0; i < panels; i++) {
    let lyTop: number, ryTop: number, shade: number, wI: number;
    if (rolled) {
      // Крайние панели завёрнуты ВНУТРЬ: дальний край поднят (уходит от зрителя),
      // ширина перспективно сжата. Средние стоят фронтально с лёгкой ступенькой,
      // чтобы у «Улитки» (4 панели) они не слиплись в одну плиту.
      if (i === 0) {
        wI = pw * 0.62; lyTop = 0; ryTop = d; shade = -0.24;
      } else if (i === panels - 1) {
        wI = pw * 0.62; lyTop = d; ryTop = 0; shade = -0.3;
      } else {
        wI = pw;
        const k = (i - 1) / Math.max(1, panels - 3);
        lyTop = d - k * d * 0.16;
        ryTop = d - (k + 0.5) * d * 0.16;
        shade = 0.06 - (i - 1) * 0.09;
      }
    } else {
      wI = pw;
      lyTop = (i % 2) * d;
      ryTop = ((i + 1) % 2) * d;
      shade = i % 2 ? -0.18 : 0.06;
    }
    const rx = lx + wI;
    raw.push({
      c: [{ x: lx, y: lyTop }, { x: rx, y: ryTop }, { x: rx, y: ryTop + ph }, { x: lx, y: lyTop + ph }],
      shade,
    });
    lx = rx;
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
  // Фронтальная панель — та, что смотрит прямо на зрителя: у рулонной крайние
  // завёрнуты внутрь, лицом остаётся середина. На неё и ставится акцент плитки.
  const accentPanel = Math.floor((panels - 1) / 2);

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
    const sh = p.shade * (o.shade ?? 1);
    poly(c); ctx.fillStyle = sh >= 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`; ctx.fill();
    // глянец ламинации — выраженный диагональный блик
    if (gloss > 0) {
      const a = 0.45 * gloss;
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
    if (o.accent && idx === accentPanel) {
      // Плитка каталога: заголовок — ЕДИНСТВЕННОЕ цветное пятно, сплошным
      // цветом и только на фронтальной панели. Покрасить его на всех трёх (как
      // это делает фольга) значит получить три красных штриха, из которых два
      // ещё и лежат по диагонали завёрнутого крыла.
      ctx.fillStyle = o.accent;
      ctx.fill();
    } else if (o.accent) {
      ctx.fillStyle = ink; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    } else if (o.foil?.on) {
      // Металл тот же, что у плоского вида (applyFoilStops): раньше здесь был
      // свой градиент с пересветом #fff7e0, и фольга на сложенном буклете
      // отличалась от фольги на всех прочих продуктах.
      const a2 = bil(c, 0.14, 0.465), b2 = bil(c, 0.62, 0.465);
      ctx.fillStyle = applyFoilStops(ctx.createLinearGradient(a2.x, a2.y, b2.x, b2.y), o.foil.hex);
      ctx.fill();
    } else { ctx.fillStyle = ink; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = ink; ctx.globalAlpha = 0.3;
    for (let l = 0; l < 3; l++) {
      const v = 0.54 + l * 0.07, ww = l === 2 ? 0.5 : 0.82;
      poly(band(c, 0.14, 0.14 + ww, v, v + 0.028)); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // контур панели — вместо тени там, где теней нет (плитка каталога)
    if (o.outline) {
      poly(c);
      ctx.strokeStyle = o.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // линия сгиба — правая кромка панели (кроме последней)
    if (idx < geom.length - 1) {
      ctx.beginPath(); ctx.moveTo(c[1].x, c[1].y); ctx.lineTo(c[2].x, c[2].y);
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1; ctx.stroke();
    }
  });
}
