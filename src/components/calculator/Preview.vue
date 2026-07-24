<script setup lang="ts">
// ПРЕВЬЮ (общий движок): геометрия (форма/размер/скругление) → контур,
// универсальные слои материи (текстура/глянец), а «рыбу» рисует макет продукта
// из реестра (mockups). Всё питается от calc; перерисовка реактивная и по ресайзу.
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { calcKey } from "../../composables/useCalculator";
import {
  shapePath, paperTexture, laminationGloss, inkColor,
  drawAccentMarks, defaultAccentMarks,
  drawUvGloss, drawEmboss, drawRaisedVarnish,
  drillHoles, euroSlot, type Rect, type ShapeKind,
} from "../../lib/preview/primitives";
import { getMockup } from "../../lib/preview/mockups";
import { drawFolded as drawFoldedShape } from "../../lib/preview/fold";

const calc = inject(calcKey)!;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

const isRound = computed(() => calc.shape === "round");
// Форма изделия для контура. «Сложная» — фигурная вырубка, у неё свой контур:
// пока она рисовалась прямоугольником, шесть продуктов предлагали вырубку без
// единого отличия в превью.
const shapeKind = computed<ShapeKind>(() =>
  calc.shape === "round" ? "round" : calc.shape === "complex" ? "complex" : "rectangular",
);
const baseColor = computed(() => calc.colors[calc.selectedColorIndex]?.hex ?? "#f3efe6");
const laminated = computed(() => calc.laminationIndex >= 0);
// Soft Touch — не «матовая подешевле»: это бархатистая плёнка, она гасит блик
// почти в ноль и делает цвет глубже. Пока обе давали 0.25, тринадцать продуктов
// предлагали выбор между двумя одинаковыми картинками.
const softTouch = computed(() => /soft/i.test(calc.laminationOptions[calc.laminationIndex]?.name ?? ""));
const glossStrength = computed(() => {
  const name = calc.laminationOptions[calc.laminationIndex]?.name ?? "";
  if (/гл[яа]нц/i.test(name)) return 1;
  if (/soft/i.test(name)) return 0.08;
  if (/мат/i.test(name)) return 0.25;
  return laminated.value ? 0.6 : 0;
});
const foilHex = computed(() => calc.foilOption?.colors?.[calc.foilColorIndex]?.hex ?? "#d9b44a");
// Выбран ли вариант ГРУППЫ доп-обработки. Сгруппированные опции (УФ-лак,
// конгрев, 3D-лак, скругление, сверление, еврослот) ведёт `finGroupIndex`, а НЕ
// `fin[]`: чекбокса у них нет, `otherOptions` их из списка исключает. Пока это
// не учитывалось, ни одна из них до превью не доезжала.
// Возвращает ИМЯ выбранного варианта (или null): у части групп варианты значат
// разные вещи, а не просто цену. `УФ-лак` — ровно такой случай.
const groupPick = (re: RegExp) =>
  computed(() => {
    const g = calc.variantGroups.find((x) => re.test(x.heading));
    if (!g) return null;
    const i = calc.finGroupIndex[g.id] ?? -1;
    return i >= 0 ? g.variants[i]?.name ?? "" : null;
  });
const uvPick = groupPick(/УФ-лак/i);
const uvOn = computed(() => uvPick.value !== null);
// «Сплошной» — глянец по ВСЕЙ поверхности, «Выборочный» — только по акценту.
// Рисовать их одинаково значит показать один товар вместо двух.
const uvSolid = computed(() => /сплошн/i.test(uvPick.value ?? ""));
const embossOn = computed(() => groupPick(/конгрев/i).value !== null);
const raisedOn = computed(() => groupPick(/3D-лак|объ[её]мный/i).value !== null);
// Сверление: число отверстий — в `count` варианта («2 отверстия» → 2).
const drillCount = computed(() => {
  const g = calc.variantGroups.find((x) => x.unit === "per_hole");
  const i = g ? calc.finGroupIndex[g.id] ?? -1 : -1;
  return g && i >= 0 ? g.variants[i]?.count ?? 1 : 0;
});
const euroPick = groupPick(/еврослот/i);
const euroSuper = computed(() => /супер/i.test(euroPick.value ?? ""));
// Отделка БЕЗ группы идёт чекбоксами (`otherOptions` → `fin[i].checked`).
const checkedOn = (re: RegExp) =>
  computed(() => calc.product.finishing.some((o, i) => re.test(o.name) && calc.fin[i]?.checked));
const numberingOn = checkedOn(/нумерац/i);
const mountedOn = checkedOn(/каширов/i);
// Скретч бывает и МАТЕРИАЛОМ (наклейки), и ОПЦИЕЙ поверх печати (билеты).
// Рендер один, поводов два — иначе галочка на билетах ничего не делает.
const scratchOptionOn = checkedOn(/скретч/i);
// Скругление углов переехало в плитки-варианты вместе с остальной доп-обработкой,
// а проверка осталась на старом пути (`fin[i].checked`) — и скруглённые углы
// перестали доезжать до превью. Держим оба пути: у части продуктов опция ещё
// может быть заведена без группы.
const cornersRounded = computed(
  () =>
    calc.product.finishing.some((o, i) => o.unit === "per_corner" && calc.fin[i]?.checked) ||
    calc.variantGroups.some(
      (g) => g.unit === "per_corner" && (calc.finGroupIndex[g.id] ?? -1) >= 0,
    ),
);
// Радиус берём из имени варианта («Радиус 5 мм»): три плитки радиуса иначе дают
// одну и ту же картинку. 0 — вариант не выбран, скругления нет.
const cornerRadiusMm = computed(() => {
  const g = calc.variantGroups.find((x) => x.unit === "per_corner");
  const i = g ? calc.finGroupIndex[g.id] ?? -1 : -1;
  if (!g || i < 0) return 0;
  const m = /(\d+(?:[.,]\d+)?)\s*мм/i.exec(g.variants[i]?.name ?? "");
  return m ? parseFloat(m[1].replace(",", ".")) : 3;
});
// Сцена: с продукта, но кластер может переопределить (`preset.previewKind`);
// второй аргумент — фолбэк на сцену продукта, если имя из пресета неизвестно.
const mockup = computed(() => getMockup(calc.previewKind, calc.product.previewKind));
const foldCount = computed(() =>
  calc.foldTypes?.length && calc.selectedFold ? calc.selectedFold.folds : 0,
);
// Тип фальцовки из данных продукта (`fold_types[].kind`): рулонная заворачивает
// панели внутрь одна в другую, гармошка складывает зигзагом. Раньше движок
// смотрел только на ЧИСЛО сгибов, из-за чего «Евро, 2 сложения» и «Гармошка,
// 2 сложения» давали пиксель-в-пиксель одинаковую картинку — а это два разных
// продвигаемых кластера (`/booklets/fold-euro` и `/booklets/fold-garmoshka`).
const foldKind = computed(() => calc.selectedFold?.kind ?? "accordion");
// Метка выбранного размера как она заведена в каталоге. Нужна сцене там, где
// размер называет ИЗДЕЛИЕ: у POS-материалов плитки — «Ценник A7», «Воблер
// 80×80», «Хенгер дверной 95×280», то есть выбор размера меняет сам предмет.
// В своём размере (customMode, sizeIndex = -1) метки нет — сцена берёт дефолт.
const sizeLabel = computed(() => calc.product.sizes[calc.sizeIndex]?.label ?? "");

// Спецрендер материала выводится из имени материала/цвета (как glossStrength от
// имени ламинации): прозрачная плёнка — «шахматка» сквозь основу; металлик/
// серебро/световозвращающая — диагональный блик. Плоский hex такие не передаёт.
const matSignature = computed(
  () => `${calc.currentPaper?.name ?? ""} ${calc.currentPaper?.materialType ?? ""} ${calc.colors[calc.selectedColorIndex]?.name ?? ""}`,
);
const isTransparent = computed(() => /прозрач/i.test(matSignature.value));
const isMetallic = computed(() => /серебр|металл|световозвр|золот/i.test(matSignature.value));
// Ещё три материала наклеек, у которых внешний вид — свойство САМОГО материала,
// а не печати: пломбировочная плёнка (при отрыве оставляет сетку «VOID»),
// скретч-слой (серая стираемая панель) и переводная плёнка-аппликация (печать
// сидит на плёнке-носителе, край которой видно). Раньше движок их не отличал —
// кластеры /stickers/void, /scratch и /transfer показывали обычную самоклейку.
// Место им здесь, а не в сцене: это отделка поверх любого макета (инвариант 1),
// как шахматка прозрачности и металлик-блик выше.
// Фотолюминесцентные бумага и плёнка — знаки безопасности и планы эвакуации.
// Именно за свечение их и берут (норматив требует видимости при отключённом
// освещении), а в превью они были неотличимы от обычной бумаги.
const isLuminous = computed(() => /люминесц/i.test(matSignature.value));
const isVoid = computed(() => /пломбир|void/i.test(matSignature.value));
const isScratch = computed(() => /скретч|scratch/i.test(matSignature.value));
const isTransfer = computed(() => /переводн|аппликац/i.test(matSignature.value));
// Фактура основы. Волокна есть не у всего: на плёнке, пластике и виниле их нет
// физически, и бумажный шум там читается как грязь. У дизайнерской, наоборот,
// фактура — то, за что её и берут, и без неё она неотличима от офсетной.
const isSmooth = computed(() => /пл[её]нк|пластик|винил|металл/i.test(matSignature.value));
const isDesigner = computed(() => /дизайнерск/i.test(matSignature.value));
// Толщина торца: картон и каширование заметно толще листа, и это видно с торца.
const isThick = computed(() => /картон|винил/i.test(matSignature.value) || mountedOn.value);
// Мелованная глянцевая бликует и без ламинации — иначе выбор между глянцевой и
// матовой мелованной ничего в превью не менял (а это 156 привязок).
const isCoatedGloss = computed(
  () => /мелован|плотн/i.test(matSignature.value) && /гл[яа]нц/i.test(matSignature.value),
);
// Наклейки — вид «вырезанной» наклейки: узкое белое поле реза вокруг печати +
// тонкий пунктир-контур по внешнему краю. Для previewKind='sticker' и
// 'volume-sticker' (объёмные — те же наклейки, но под куполом смолы) И
// когда выбран рез по контуру (надсечка/вырубка). «На листе» (cutType='none') —
// печать во весь лист, без белого поля и пунктира.
// Стикерпак — не одна вырубленная наклейка, а ЛИСТ с россыпью: белого поля реза
// и пунктира по краю у него быть не должно, рез рисует сцена вокруг каждой.
const STICKER_KINDS = ["sticker", "volume-sticker"];
const isSticker = computed(
  () =>
    STICKER_KINDS.includes(calc.previewKind ?? "") &&
    (!calc.allowContourCut || calc.cutType !== "none"),
);

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

// Фактура дизайнерской бумаги — тиснение «лён»: частая сетка тонких штрихов.
// Без неё дизайнерская неотличима от офсетной, хотя стоит кратно дороже.
function drawLaidTexture(ctx: CanvasRenderingContext2D, r: Rect) {
  const step = Math.max(3, Math.min(r.w, r.h) * 0.022);
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "#3a352c";
  ctx.lineWidth = 0.7;
  for (let y = r.y; y < r.y + r.h; y += step) {
    ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke();
  }
  ctx.globalAlpha = 0.06;
  for (let x = r.x; x < r.x + r.w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke();
  }
  ctx.restore();
}

// Мягкое бархатистое свечение Soft Touch: широкая рассеянная засветка без
// резкой полосы. Полоса — признак глянца, у soft touch её быть не должно.
function drawSoftTouchBloom(ctx: CanvasRenderingContext2D, r: Rect) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.6, r.y + r.h);
  g.addColorStop(0, "rgba(255,255,255,0.14)");
  g.addColorStop(0.55, "rgba(255,255,255,0.04)");
  g.addColorStop(1, "rgba(20,18,16,0.06)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Нумерация: типографский порядковый номер. Его печатают отдельным прогоном и
// традиционно красным — по цвету он и узнаётся.
function drawSerial(ctx: CanvasRenderingContext2D, r: Rect) {
  const u = Math.min(r.w, r.h);
  ctx.save();
  ctx.fillStyle = "rgba(178,42,38,0.88)";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = `700 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
  ctx.fillText("№ 000148", r.x + r.w - u * 0.07, r.y + u * 0.07);
  ctx.restore();
}

// Фотолюминесцентный материал, дневная сторона: сама основа бледно-жёлто-зелёная.
// Кладётся ПОД печать, как и VOID, — это цвет материала, а не эффект поверх.
function drawLuminousBase(ctx: CanvasRenderingContext2D, r: Rect) {
  ctx.save();
  ctx.fillStyle = "rgba(206,240,152,0.6)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Он же, ночная сторона: накопленный свет отдаётся наружу. Режим `screen` —
// свет СКЛАДЫВАЕТСЯ с тем, что под ним; при обычной альфе полупрозрачная
// зелень просто сереет по печати и читается как грязь, а не как свечение.
function drawLuminousGlow(ctx: CanvasRenderingContext2D, r: Rect) {
  const u = Math.min(r.w, r.h);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createRadialGradient(cx, cy, u * 0.05, cx, cy, u * 0.9);
  g.addColorStop(0, "rgba(168,255,110,0.4)");
  g.addColorStop(0.6, "rgba(140,230,90,0.16)");
  g.addColorStop(1, "rgba(120,210,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Пломбировочная (VOID): сетка ячеек со словом VOID — тот самый след, который
// плёнка оставляет на поверхности при попытке отклеить. Рисуем ПОД печатью и
// приглушённо: на целой пломбе он едва проступает, читается как защитный фон.
function drawVoidPattern(ctx: CanvasRenderingContext2D, r: Rect) {
  const cell = Math.max(14, Math.min(r.w, r.h) / 6);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#5a6470";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5a6470";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(cell * 0.3)}px system-ui, sans-serif`;
  for (let iy = 0, y = r.y; y < r.y + r.h; iy++, y += cell) {
    for (let ix = 0, x = r.x; x < r.x + r.w; ix++, x += cell) {
      ctx.strokeRect(x, y, cell, cell);
      // шахматный порядок: сплошная «VOID» по всем ячейкам читается как каша
      if ((ix + iy) % 2 === 0) ctx.fillText("VOID", x + cell / 2, y + cell / 2);
    }
  }
  ctx.restore();
}

// Скретч-слой: непрозрачная серая панель, которую стирают монетой. Кладём ПОВЕРХ
// печати и по ЦЕНТРУ — панель и должна прятать то, что под ней, а подпись бренда
// внизу сцены остаётся видимой (в нижней трети она их перекрывала).
// Сам материал серебристый, поэтому панели нужны обводка и тёмный градиент —
// иначе она сливается с основой и читается как блик, а не как слой.
function drawScratchPanel(ctx: CanvasRenderingContext2D, r: Rect) {
  const u = Math.min(r.w, r.h);
  const pw = r.w * 0.62, ph = r.h * 0.26;
  const px = r.x + (r.w - pw) / 2, py = r.y + r.h * 0.32;
  ctx.save();
  const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
  g.addColorStop(0, "#9aa2aa");
  g.addColorStop(0.45, "#767f88");
  g.addColorStop(0.55, "#8d959d");
  g.addColorStop(1, "#69727b");
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);
  // зерно скретч-краски
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#2b3038";
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(px + Math.random() * pw, py + Math.random() * ph, 1, 1);
  }
  // следы монеты по диагонали
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#eef1f4";
  ctx.lineWidth = Math.max(1, u * 0.012);
  for (let i = 0; i < 3; i++) {
    const oy = py + ph * (0.28 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.12, oy);
    ctx.lineTo(px + pw * (0.42 + i * 0.14), oy - ph * 0.1);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#3d444c";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);
  ctx.restore();
}

// Переводная (аппликация): печать лежит на плёнке-носителе, поверх — монтажный
// слой. Показываем это рамкой-кантом носителя с отогнутым уголком.
function drawTransferFilm(ctx: CanvasRenderingContext2D, r: Rect) {
  const u = Math.min(r.w, r.h);
  const inset = u * 0.07;
  ctx.save();
  ctx.strokeStyle = "rgba(90,110,130,0.55)";
  ctx.lineWidth = Math.max(1, u * 0.008);
  ctx.setLineDash([u * 0.05, u * 0.035]);
  ctx.strokeRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset);
  ctx.setLineDash([]);
  // отогнутый уголок носителя (правый нижний): светлый треугольник + тень сгиба
  const c = u * 0.28;
  const bx = r.x + r.w - inset, by = r.y + r.h - inset;
  ctx.beginPath();
  ctx.moveTo(bx - c, by);
  ctx.lineTo(bx, by - c);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(50,70,92,0.7)";
  ctx.lineWidth = Math.max(1, u * 0.01);
  ctx.beginPath();
  ctx.moveTo(bx - c, by);
  ctx.lineTo(bx, by - c);
  ctx.stroke();
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

  // Буклеты: 3D-вид сложенного изделия вместо плоского листа.
  // Биговка (`crease`, у чертежей) — НЕ сложение: линию продавливают, а лист
  // остаётся плоским. Показываем его листом с пунктиром по линиям бига — этот
  // код ниже уже был, но до сюда не доходил, потому что любой folds > 0
  // уводил в drawFolded, и чертёж показывался сложенным гармошкой.
  if (foldCount.value > 0 && foldKind.value !== "crease") {
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
  const cornerPx = Math.min(minSide * 0.35, cornerRadiusMm.value * (cw / (calc.dims.w || 90)));
  const radius = isRound.value
    ? minSide / 2
    : cornersRounded.value ? cornerPx : minSide * 0.03;
  const r: Rect = { x, y, w: cw, h: ch };

  // Наклейка: внешний контур r — линия реза; печать вписана в mr с узким белым
  // полем (die-cut margin). У прочих продуктов mr = r (поле нулевое).
  const margin = isSticker.value ? minSide * 0.06 : 0;
  const mr: Rect = { x: r.x + margin, y: r.y + margin, w: r.w - 2 * margin, h: r.h - 2 * margin };
  const mMin = Math.min(mr.w, mr.h);
  // Радиус скругления — в МИЛЛИМЕТРАХ изделия, переведённых в пиксели по
  // текущему масштабу: «Радиус 3 мм» на визитке и на плакате обязаны отличаться
  // так же, как отличаются в жизни. Кламп сверху — чтобы на мелком изделии
  // радиус не съел его в круг.
  const mmToPx = cw / (calc.dims.w || 90);
  const mRadius = isRound.value
    ? mMin / 2
    : cornersRounded.value
      ? Math.min(mMin * 0.35, cornerRadiusMm.value * mmToPx)
      : mMin * 0.03;

  // Торец: картон и каширование заметно толще листа. Смещённая копия контура
  // под изделием читается как срез. Рисует СТЕЙДЖ, не сцена, — толщина у любого
  // продукта обязана выглядеть одинаково.
  if (isThick.value) {
    const t = Math.max(2, minSide * 0.022);
    ctx.save();
    shapePath(ctx, { x: r.x + t * 0.35, y: r.y + t, w: r.w, h: r.h }, radius, shapeKind.value);
    ctx.fillStyle = "rgba(120,110,96,0.85)";
    ctx.fill();
    ctx.restore();
  }

  // тень под наклейкой + подложка (у наклейки поле реза белое, печать — внутри mr)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.25)";
  ctx.shadowBlur = minSide * 0.12;
  ctx.shadowOffsetY = minSide * 0.05;
  shapePath(ctx, r, radius, shapeKind.value);
  ctx.fillStyle = isSticker.value ? "#ffffff" : baseColor.value;
  ctx.fill();
  ctx.restore();

  // материя + содержимое внутри mr: текстура → «рыба» → глянец → фольга
  const env = {
    round: isRound.value,
    ink: inkColor(baseColor.value),
    foilOn: calc.foilOn,
    foilHex: foilHex.value,
    foldCount: foldCount.value,
    sizeLabel: sizeLabel.value,
  };
  // Поле для «куклы». У фигурной вырубки лепестковый контур режет углы, поэтому
  // ink вписываем внутрь силуэта: без этого на вырубленной визитке обрезало
  // монограмму и имя. Материю и глянец это не касается — они идут по всему mr.
  const si = shapeKind.value === "complex" ? mMin * 0.11 : 0;
  const sr: Rect = { x: mr.x + si, y: mr.y + si, w: mr.w - 2 * si, h: mr.h - 2 * si };

  ctx.save();
  shapePath(ctx, mr, mRadius, shapeKind.value);
  ctx.clip();
  if (isSticker.value) { ctx.fillStyle = baseColor.value; ctx.fillRect(mr.x, mr.y, mr.w, mr.h); }
  if (isTransparent.value) drawTransparencyGrid(ctx, mr);
  if (isLuminous.value) drawLuminousBase(ctx, mr);
  // Волокна — только у бумаги. На плёнке и пластике их нет физически, и шум там
  // читается как грязь; у дизайнерской вместо шума своё тиснение.
  if (!isSmooth.value) {
    paperTexture(ctx, mr, laminated.value ? 22 : 46, laminated.value ? 0.35 : 0.7);
  }
  if (isDesigner.value) drawLaidTexture(ctx, mr);
  // VOID — защитный фон, он ПОД печатью; скретч-панель, наоборот, поверх (её
  // работа — прятать), переводная плёнка обрамляет печать носителем.
  if (isVoid.value) drawVoidPattern(ctx, mr);
  mockup.value.content(ctx, sr, env);
  if (numberingOn.value) drawSerial(ctx, sr);
  if (isMetallic.value) drawMetallicSheen(ctx, mr);
  if (isLuminous.value) drawLuminousGlow(ctx, mr);
  if (isScratch.value || scratchOptionOn.value) drawScratchPanel(ctx, sr);
  if (isTransfer.value) drawTransferFilm(ctx, mr);
  // Мелованная глянцевая бликует и без ламинации, но слабее неё.
  if (isCoatedGloss.value && !laminated.value) laminationGloss(ctx, mr, 0.3);
  if (glossStrength.value > 0) {
    if (softTouch.value) drawSoftTouchBloom(ctx, mr);
    else laminationGloss(ctx, mr, glossStrength.value);
  }
  // Фольга: сцена только ОБЪЯВЛЯЕТ метки, металл кладёт движок — одинаково на
  // всех продуктах. Сцена без меток получает фолбэк, а не тишину: раньше
  // `mockup.foil` просто отсутствовал у 12 сцен, и на бейджах, буклетах,
  // открытках, билетах и POS-материалах галочка фольги не давала ничего.
  // Все четыре отделки украшают ОДИН и тот же элемент куклы, поэтому метки
  // считаются один раз. Пустой список — осознанный запрет (QR-код, газета),
  // отсутствие метода — недосмотр сцены, его закрывает фолбэк.
  if (calc.foilOn || uvOn.value || embossOn.value || raisedOn.value) {
    const marks = mockup.value.accentMarks?.(sr, env) ?? defaultAccentMarks(sr, isRound.value);
    if (calc.foilOn) drawAccentMarks(ctx, marks, foilHex.value);
    // Лак и конгрев идут ПОСЛЕ фольги: лакировать и тиснить по металлу можно,
    // и тогда рельеф обязан лежать поверх него.
    if (embossOn.value) drawEmboss(ctx, marks);
    if (raisedOn.value) drawRaisedVarnish(ctx, marks);
    // сплошной лак — глянец по всему изделию, выборочный — только по акценту
    if (uvOn.value) {
      if (uvSolid.value) laminationGloss(ctx, mr, 0.9);
      else drawUvGloss(ctx, marks);
    }
    // купол смолы обязан лечь ПОВЕРХ всего (объёмные наклейки)
    if (calc.foilOn) mockup.value.afterFoil?.(ctx, sr, env);
  }
  // Вырубные отверстия — последними: это физический рез сквозь всё, включая
  // лак и фольгу. Общий примитив, чтобы дырка в бирке и в ценнике совпадали.
  if (drillCount.value > 0) drillHoles(ctx, sr, drillCount.value);
  if (euroPick.value !== null) euroSlot(ctx, sr, euroSuper.value);
  // линии сгиба (буклеты): пунктир, делит лист на панели foldCount+1
  if (foldCount.value > 0) {
    ctx.strokeStyle = "rgba(0,0,0,.4)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    const pw = mr.w / (foldCount.value + 1);
    for (let i = 1; i <= foldCount.value; i++) {
      const fx = mr.x + i * pw;
      ctx.beginPath();
      ctx.moveTo(fx, mr.y);
      ctx.lineTo(fx, mr.y + mr.h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();

  // контур реза наклейки — пунктир по внешнему краю
  if (isSticker.value) {
    ctx.save();
    shapePath(ctx, r, radius, shapeKind.value);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.3)";
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // тонкий контур печати
  ctx.save();
  shapePath(ctx, mr, mRadius, shapeKind.value);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.15)";
  ctx.stroke();
  ctx.restore();
}

// 3D-вид сложенного буклета. Сама отрисовка — в `lib/preview/fold.ts`: тот же
// вид нужен плитке каталога, а она собирается без Vue, поэтому код не может
// жить в компоненте. Здесь остаётся только проброс состояния калькулятора.
function drawFolded(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  drawFoldedShape(ctx, cssW, cssH, {
    panels: foldCount.value + 1,
    kind: foldKind.value,
    sheet: { w: calc.dims.w, h: calc.dims.h },
    cover: baseColor.value,
    ink: inkColor(baseColor.value),
    gloss: glossStrength.value,
    foil: { on: calc.foilOn, hex: foilHex.value },
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
    calc.foilOn, foilHex.value, cornersRounded.value, calc.previewKind,
    foldCount.value, foldKind.value, calc.foldTypeIndex,
    isTransparent.value, isMetallic.value, calc.selectedColorIndex,
    isVoid.value, isScratch.value, isTransfer.value, isLuminous.value, sizeLabel.value,
    uvOn.value, uvSolid.value, embossOn.value, raisedOn.value, cornerRadiusMm.value,
    drillCount.value, euroPick.value, numberingOn.value, mountedOn.value,
    scratchOptionOn.value, softTouch.value, shapeKind.value,
    isSmooth.value, isDesigner.value, isThick.value, isCoatedGloss.value,
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
