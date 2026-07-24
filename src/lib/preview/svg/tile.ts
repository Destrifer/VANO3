// Плитка каталога: инлайновый SVG сцены продукта, отрисованный на СБОРКЕ через
// адаптер `SvgContext`. Повторяет геометрию `Preview.vue::draw()` (вписать
// карточку нужной пропорции, контур, скругление), но БЕЗ материи, глянца и
// фольги — плитке нужен узнаваемый ink-силуэт, а не фотореализм (урок из
// 07-preview-mockups.md: «узнаваемость важнее правдоподобия»).
//
// Сцену берём из того же реестра `mockups.ts`, что и живое превью — одна
// реализация макета на оба места (инвариант 1). Multipage-обложки (covers.ts)
// пока не покрыты: у них свой stage (книжка), это отдельный заход.
import { getMockup } from "../mockups";
import { shapePath, type Rect, type ShapeKind } from "../primitives";
import { drawFolded } from "../fold";
import { SvgContext } from "./context";
import { paintAccentMarks, resolveAccent } from "./accent";
import { tileOverrides } from "./overrides";
import { tileAspect } from "./aspect";

export type TileInput = {
  previewKind?: string | null;
  // формат изделия в мм (первый размер каталога) — задаёт пропорцию куклы
  mm?: { w: number; h: number } | null;
  round?: boolean;
  sizeLabel?: string; // метка размера (POS-материалы ветвят силуэт по ней)
  base?: string; // цвет бумаги; по умолчанию нейтральный крем
  // Фальцовка изделия: если задана, плитка рисует СЛОЖЕННЫЙ вид вместо листа.
  fold?: { folds: number; kind: string } | null;
};

// Пропорции медиа-зоны плитки. 0.66 — как высота живого превью (cssH = cssW·0.66).
// Экспортируются, потому что stage обложек (`coverTile.ts`) обязан жить в той же
// системе координат: плитки листовых и книжек стоят в одной сетке каталога.
export const W = 300;
export const H = 198;

// Бумага изделия — CSS-переменная, а не hex: адаптер пропускает `var(...)` мимо
// монохромной перекраски, и плитка становится темозависимой (на тёмной теме
// бумага и краска меняются местами сами). Раньше здесь был кремовый #f4efe6, и
// на белой нео-нуар странице плитки читались как выцветшие.
const BASE = "var(--color-base-100)";
// Краска сцены. Сцены считают от него свои полутона (`globalAlpha`), а адаптер
// сводит результат к доле `--color-base-content`, поэтому нужен ЧИСТО чёрный:
// любой оттенок здесь просто отнял бы контраст у всей куклы.
const INK = "#000000";

export function productTileSvg(input: TileInput): string {
  const round = !!input.round;
  const shape: ShapeKind = round ? "round" : "rectangular";
  const base = input.base ?? BASE;
  const ctx = new SvgContext(W, H, { halftone: true });
  const c = ctx as unknown as CanvasRenderingContext2D;

  // Сложенное изделие (буклеты) рисуется 3D-видом, тем же кодом, что и живое
  // превью (`lib/preview/fold.ts`). Без этого плитка буклетов была плоским
  // листом и не отличалась от «Документов» — сцена у них одна, различала их
  // только фальцовка. Биговка (`crease`) — не сложение, лист остаётся плоским.
  if (input.fold && input.fold.folds > 0 && input.fold.kind !== "crease") {
    drawFolded(c, W, H, {
      panels: input.fold.folds + 1,
      kind: input.fold.kind,
      sheet: { w: input.mm?.w || 297, h: input.mm?.h || 210 },
      cover: base,
      ink: INK,
      // Заголовок первой панели — единственное цветное пятно плитки (роль,
      // которую на плоских сценах играет `accentMarks`).
      accent: "var(--color-accent-ink)",
      outline: "rgba(0,0,0,.15)",
      // Тень гасим до 0.35: в монохроме она становится краской, и на штатной
      // силе завёрнутые панели уходили в сплошной хафтон (см. FoldOpts.shade).
      shade: 0.35,
    });
    return wrap(ctx);
  }

  // вписать карточку нужной пропорции в рамку с полями (как в Preview.vue).
  // Пропорцию может переопределить `tileAspect` — там, где каталожный размер
  // это РАЗВЁРТКА под вырубку, а не готовое изделие (папки).
  const forced = tileAspect[input.previewKind ?? ""];
  const aw = round ? 1 : forced?.w || input.mm?.w || 90;
  const ah = round ? 1 : forced?.h || input.mm?.h || 50;
  const aspect = aw / ah;
  const fpad = Math.min(W, H) * 0.14;
  const availW = W - 2 * fpad, availH = H - 2 * fpad;
  let cw = availW, ch = cw / aspect;
  if (ch > availH) { ch = availH; cw = ch * aspect; }
  const x = (W - cw) / 2, y = (H - ch) / 2;
  const minSide = Math.min(cw, ch);
  const radius = round ? minSide / 2 : minSide * 0.03;
  const r: Rect = { x, y, w: cw, h: ch };

  // подложка изделия
  shapePath(c, r, radius, shape);
  c.fillStyle = base;
  c.fill();

  // ink-«кукла» внутри контура.
  const mockup = getMockup(input.previewKind);
  const env = {
    round,
    ink: INK,
    // `foilOn` здесь не про фольгу: им сцена решает, печатать ли свой
    // декорируемый элемент краской (false) или уступить его движку (true).
    // Ставим true РОВНО тогда, когда акцент действительно будет положен, иначе
    // элемент не нарисует никто и он исчезнет с плитки.
    foilOn: false,
    foilHex: "#d9b44a",
    foldCount: 0,
    sizeLabel: input.sizeLabel ?? "",
  };
  const accent = resolveAccent(mockup, r, env);
  env.foilOn = accent !== null;

  c.save();
  shapePath(c, r, radius, shape);
  c.clip();
  // Сцена, чей эффект не переживает монохром, рисуется обходом (см. overrides.ts).
  (tileOverrides[input.previewKind ?? ""] ?? mockup.content)(c, r, env);
  // Единственное цветное пятно — там, где сцена сама объявила акцент.
  if (accent) paintAccentMarks(c, accent);
  c.restore();

  // тонкий контур печати
  shapePath(c, r, radius, shape);
  c.lineWidth = 1;
  c.strokeStyle = "rgba(0,0,0,.15)";
  c.stroke();

  return wrap(ctx);
}

function wrap(ctx: SvgContext): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="product-tile__svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${ctx.toSVG()}</svg>`;
}
