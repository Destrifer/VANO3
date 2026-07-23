// Реестр обложек многостраничной продукции. Полный аналог `mockups.ts`, но для
// другого stage: там плоский лист (Preview.vue), здесь книжка (BookletPreview.vue).
// Сцена рисует ТОЛЬКО ink на обложке; формат, толщина блока, переплёт, кант
// твёрдой обложки, кольца, ремешок, текстура, глянец и фольга — движок.
//
// Почему отдельный реестр, а не общий с `mockups`: у обложки другой контракт
// окружения (переплёт, число полос, разлиновка) и другие слои вокруг. Ключ при
// этом ОБЩИЙ — `products.preview_kind`, просто резолвится в своём реестре.
import type { AccentMark, Rect } from "./primitives";
import { dieCutWindow, roundRect } from "./primitives";

// Вид переплёта, выведенный из имени в Directus. `hardcover` — 7БЦ: до этого
// он не распознавался и молча падал в «скрепку», из-за чего подарочный
// ежедневник и выпускной альбом (у них 7БЦ первый в списке = выбран по
// умолчанию) показывались сшитыми скобой.
export type BindingKind = "staple" | "spiral" | "glue" | "hardcover";

export type CoverEnv = {
  ink: string; // цвет краски (контраст к бумаге обложки)
  cover: string; // hex обложки
  foilOn: boolean;
  foilHex: string;
  binding: BindingKind;
  pages: number;
  ruling: string | null; // «Клетка» / «Линейка» / «Точка» / «Чистый» / null
  mm: { w: number; h: number }; // формат изделия в мм
};

// Конструктивные признаки, которые рисует ДВИЖОК (чтобы кольца и ремешок
// выглядели одинаково везде), но объявляет сцена — это свойство изделия,
// а не выбор пользователя.
export type CoverFeatures = {
  rings?: boolean; // кольца вместо спирали (тетради на кольцах)
  strap?: boolean; // резинка-ремешок + ляссе (ежедневники)
};

export type Cover = {
  content: (ctx: CanvasRenderingContext2D, r: Rect, env: CoverEnv) => void;
  // ГДЕ на обложке лежит фольга. Как блестит металл — знает `drawAccentMarks()`,
  // тот же, что у листовых: тиснение на ежедневнике и на визитке обязаны
  // выглядеть одинаково. Обложка без меток получает `defaultAccentMarks()` —
  // раньше здесь был рисующий `foil()`, и тетради с газетой на выбор фольги
  // не отвечали вовсе.
  accentMarks?: (r: Rect, env: CoverEnv) => AccentMark[];
  features?: CoverFeatures;
  // Полный self-render в обход общего stage. Прецедент-исключение: изделие
  // физически НЕ книжка (газета — сфальцованный лист без переплёта), общая
  // сцена ему врёт целиком, а не в деталях.
  render?: (ctx: CanvasRenderingContext2D, cssW: number, cssH: number, env: CoverEnv) => void;
};

// — общие мелочи —

const SANS = "system-ui, sans-serif";
const SERIF = "Georgia, serif";

// Плашка изображения (место под фото/иллюстрацию).
function plate(ctx: CanvasRenderingContext2D, r: Rect, ink: string, alpha = 0.14, rad = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ink;
  if (rad > 0) { roundRect(ctx, r.x, r.y, r.w, r.h, rad); ctx.fill(); }
  else ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Строки текста-«рыбы».
function textLines(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, lineH: number,
  count: number, ink: string, alpha = 0.28, last = 0.55,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ink;
  for (let i = 0; i < count; i++) {
    const ww = i === count - 1 ? w * last : w;
    ctx.fillRect(x, y + i * lineH * 2, ww, lineH);
  }
  ctx.restore();
}

// Фотоснимок-«рыба»: небо градиентом, горизонт, солнце, силуэт гор.
function photo(ctx: CanvasRenderingContext2D, r: Rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  sky.addColorStop(0, "#8fb3c9");
  sky.addColorStop(0.55, "#d9c9ae");
  sky.addColorStop(1, "#9c8a6f");
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = "rgba(255,245,220,.85)";
  ctx.beginPath();
  ctx.arc(r.x + r.w * 0.7, r.y + r.h * 0.34, Math.min(r.w, r.h) * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(60,66,62,.75)";
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h * 0.72);
  ctx.lineTo(r.x + r.w * 0.28, r.y + r.h * 0.5);
  ctx.lineTo(r.x + r.w * 0.46, r.y + r.h * 0.68);
  ctx.lineTo(r.x + r.w * 0.66, r.y + r.h * 0.44);
  ctx.lineTo(r.x + r.w, r.y + r.h * 0.7);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Заголовок: фольгой (если включена) — через общий drawFoilText, иначе краской.
// Возвращает высоту кегля, чтобы сцена могла считать раскладку дальше.
function heading(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, top: number, size: number, env: CoverEnv,
  font = SERIF, alpha = 0.88,
) {
  if (env.foilOn) return size; // нарисует foil-слой поверх глянца
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `700 ${size}px ${font}`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = env.ink;
  ctx.fillText(text, cx, top);
  ctx.restore();
  return size;
}

// — сцены —

// Брошюра — базовый образ и фолбэк для всего multipage.
const booklet: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    heading(ctx, "Брошюра", cx, r.y + r.h * 0.28, m * 0.13, env);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = env.ink;
    ctx.font = `400 ${m * 0.058}px ${SANS}`;
    ctx.fillText("информационная · 2026", cx, r.y + r.h * 0.42);
    ctx.restore();
    textLines(ctx, cx - r.w * 0.25, r.y + r.h * 0.62, r.w * 0.5, m * 0.014, 3, env.ink, 0.25);
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "Брошюра", x: r.x + r.w / 2, y: r.y + r.h * 0.28, size: m * 0.13, align: "center" }];
  },
};

// Книга — автор сверху, название по центру, марка издательства внизу.
// Покрывает кластеры мягкого/твёрдого переплёта, подарочных, детских и
// «в 1 экземпляр»: всё это переплёт, бумага и тираж, то есть движок.
const book: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = env.ink;

    ctx.globalAlpha = 0.6;
    ctx.font = `400 ${m * 0.062}px ${SANS}`;
    ctx.fillText("А. СМИРНОВ", cx, r.y + r.h * 0.14);
    ctx.restore();

    heading(ctx, "Дорога домой", cx, r.y + r.h * 0.34, m * 0.115, env);

    // тонкая линейка под названием
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = env.ink;
    ctx.lineWidth = Math.max(1, m * 0.006);
    ctx.beginPath();
    ctx.moveTo(cx - r.w * 0.18, r.y + r.h * 0.52);
    ctx.lineTo(cx + r.w * 0.18, r.y + r.h * 0.52);
    ctx.stroke();

    // марка издательства — кружок с монограммой
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, m * 0.007);
    const rad = m * 0.06;
    ctx.beginPath();
    ctx.arc(cx, r.y + r.h * 0.8, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = env.ink;
    ctx.font = `700 ${rad * 0.9}px ${SERIF}`;
    ctx.fillText("PM", cx, r.y + r.h * 0.8);
    ctx.restore();
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "Дорога домой", x: r.x + r.w / 2, y: r.y + r.h * 0.34, size: m * 0.115, align: "center" }];
  },
};

// Каталог — шапка + сетка товарных плашек с ценниками. Отличие от брошюры
// именно в сетке: каталог узнаётся по ней, а не по слову.
const catalog: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    heading(ctx, "КАТАЛОГ", cx, r.y + r.h * 0.09, m * 0.11, env, SANS);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = env.ink;
    ctx.font = `400 ${m * 0.05}px ${SANS}`;
    ctx.fillText("продукция · 2026", cx, r.y + r.h * 0.21);
    ctx.restore();

    // сетка 2×3
    const gx = r.x + r.w * 0.12;
    const gw = r.w * 0.76;
    const gy = r.y + r.h * 0.31;
    const gh = r.h * 0.56;
    const cols = 2, rows = 3;
    const gap = m * 0.04;
    const cw = (gw - gap) / cols;
    const chh = (gh - gap * (rows - 1)) / rows;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cellX = gx + j * (cw + gap);
        const cellY = gy + i * (chh + gap);
        plate(ctx, { x: cellX, y: cellY, w: cw, h: chh * 0.66 }, env.ink, 0.16, m * 0.012);
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = env.ink;
        ctx.fillRect(cellX, cellY + chh * 0.76, cw * 0.7, m * 0.012);
        ctx.globalAlpha = 0.5;
        ctx.fillRect(cellX, cellY + chh * 0.9, cw * 0.36, m * 0.016);
        ctx.restore();
      }
    }
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "КАТАЛОГ", x: r.x + r.w / 2, y: r.y + r.h * 0.09, size: m * 0.11, align: "center", font: SANS }];
  },
};

// Журнал — мачта во всю ширину, обложечное фото, анонсы, штрихкод.
const magazine: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;

    // обложечное фото — почти вся площадь, мачта поверх него
    photo(ctx, { x: r.x, y: r.y + r.h * 0.16, w: r.w, h: r.h * 0.84 });

    heading(ctx, "ЖУРНАЛ", cx, r.y + r.h * 0.04, m * 0.155, env, SANS, 0.95);

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // анонсы на светлой подложке слева внизу
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "#f6f3ec";
    ctx.fillRect(r.x + r.w * 0.06, r.y + r.h * 0.62, r.w * 0.5, r.h * 0.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#26241f";
    ctx.font = `700 ${m * 0.052}px ${SANS}`;
    ctx.fillText("Главная тема", r.x + r.w * 0.09, r.y + r.h * 0.655);
    ctx.globalAlpha = 0.6;
    ctx.font = `400 ${m * 0.042}px ${SANS}`;
    ctx.fillText("репортаж номера", r.x + r.w * 0.09, r.y + r.h * 0.73);
    ctx.restore();

    // штрихкод + номер
    ctx.save();
    ctx.fillStyle = "#f6f3ec";
    ctx.globalAlpha = 0.9;
    const bw = r.w * 0.2, bh = r.h * 0.08;
    const bx = r.x + r.w - bw - r.w * 0.06, by = r.y + r.h - bh - r.h * 0.05;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#26241f";
    for (let i = 0, px = bx + bw * 0.08; px < bx + bw * 0.92; i++) {
      const lw = (i % 3 === 0 ? 2.2 : 1) * (bw * 0.018);
      ctx.fillRect(px, by + bh * 0.15, lw, bh * 0.7);
      px += lw + bw * 0.03;
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#f6f3ec";
    ctx.font = `600 ${m * 0.045}px ${SANS}`;
    ctx.fillText("№ 7 · 2026", cx, r.y + r.h * 0.185);
    ctx.restore();
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "ЖУРНАЛ", x: r.x + r.w / 2, y: r.y + r.h * 0.04, size: m * 0.155, align: "center", font: SANS }];
  },
};

// Фотокнига — полнокадровое фото под вырубным окном + подпись.
// Кластеры (свадебная/детская/семейная/трэвел) различаются сюжетом, то есть
// содержимым макета клиента; конструкция у всех одна.
const photobook: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const win: Rect = {
      x: r.x + r.w * 0.1,
      y: r.y + r.h * 0.1,
      w: r.w * 0.8,
      h: r.h * 0.62,
    };
    photo(ctx, win);
    dieCutWindow(ctx, win, m * 0.02);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = env.ink;
    ctx.font = `400 ${m * 0.05}px ${SANS}`;
    ctx.fillText("фотокнига", r.x + r.w / 2, r.y + r.h * 0.79);
    ctx.restore();

    heading(ctx, "Наше лето", r.x + r.w / 2, r.y + r.h * 0.85, m * 0.085, env);
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "Наше лето", x: r.x + r.w / 2, y: r.y + r.h * 0.85, size: m * 0.085, align: "center" }];
  },
};

// Ежедневник — слепое тиснение по центру, год, резинка-ремешок и ляссе (движок).
const planner: Cover = {
  features: { strap: true },
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h * 0.42;
    const rad = m * 0.15;

    // рамка-тиснение
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = env.ink;
    ctx.lineWidth = Math.max(1, m * 0.008);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (!env.foilOn) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = env.ink;
      ctx.font = `700 ${rad * 0.8}px ${SERIF}`;
      ctx.fillText("PM", cx, cy);
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = env.ink;
    ctx.font = `600 ${m * 0.075}px ${SANS}`;
    ctx.fillText("2026", cx, r.y + r.h * 0.66);
    ctx.globalAlpha = 0.4;
    ctx.font = `400 ${m * 0.042}px ${SANS}`;
    ctx.fillText("ЕЖЕДНЕВНИК", cx, r.y + r.h * 0.77);
    ctx.restore();
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    const size = m * 0.12;
    return [{ kind: "text", text: "PM", x: r.x + r.w / 2, y: r.y + r.h * 0.42 - size / 2, size, align: "center" }];
  },
};

// Блокнот — минимализм: лого сверху, много воздуха. Кластеры «с логотипом» и
// «на пружине» покрываются одним образом (пружина приезжает переплётом).
const notepad: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = env.ink;
    ctx.lineWidth = Math.max(1, m * 0.014);
    const s = m * 0.11;
    ctx.strokeRect(cx - s / 2, r.y + r.h * 0.3, s, s);
    ctx.restore();

    heading(ctx, "PRINTMOS", cx, r.y + r.h * 0.48, m * 0.07, env, SANS, 0.7);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = env.ink;
    ctx.font = `400 ${m * 0.04}px ${SANS}`;
    ctx.fillText("блокнот для записей", cx, r.y + r.h * 0.58);
    ctx.restore();
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "PRINTMOS", x: r.x + r.w / 2, y: r.y + r.h * 0.48, size: m * 0.07, align: "center", font: SANS }];
  },
};

// Тетрадь — шильдик «Предмет / Класс / ФИО» и образец выбранной разлиновки.
// Разлиновка блока внутри не видна, поэтому показываем её образцом на обложке:
// пользователь выбрал «клетку» — превью обязано на это отвечать.
const copybook: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;

    // шильдик с линиями для подписи
    const px = r.x + r.w * 0.12;
    const pw = r.w * 0.76;
    const py = r.y + r.h * 0.14;
    const ph = r.h * 0.34;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = env.ink;
    ctx.lineWidth = Math.max(1, m * 0.006);
    roundRect(ctx, px, py, pw, ph, m * 0.02);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = env.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `400 ${m * 0.045}px ${SANS}`;
    ["Предмет", "Класс", "Ф. И. О."].forEach((label, i) => {
      const ly = py + ph * (0.26 + i * 0.26);
      ctx.fillText(label, px + pw * 0.08, ly);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(px + pw * 0.42, ly + m * 0.018, pw * 0.5, Math.max(1, m * 0.005));
      ctx.globalAlpha = 0.35;
    });
    ctx.restore();

    // образец разлиновки
    const sx = r.x + r.w * 0.24;
    const sw = r.w * 0.52;
    const sy = r.y + r.h * 0.58;
    const sh = r.h * 0.22;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = env.ink;
    ctx.fillStyle = env.ink;
    ctx.lineWidth = Math.max(0.5, m * 0.0035);
    const step = m * 0.035;
    const kind = env.ruling ?? "";
    if (/клет/i.test(kind)) {
      for (let gx = sx; gx <= sx + sw; gx += step) {
        ctx.beginPath(); ctx.moveTo(gx, sy); ctx.lineTo(gx, sy + sh); ctx.stroke();
      }
      for (let gy = sy; gy <= sy + sh; gy += step) {
        ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + sw, gy); ctx.stroke();
      }
    } else if (/точк/i.test(kind)) {
      for (let gy = sy + step; gy < sy + sh; gy += step) {
        for (let gx = sx + step; gx < sx + sw; gx += step) {
          ctx.beginPath(); ctx.arc(gx, gy, Math.max(0.7, m * 0.005), 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (!kind || /чист/i.test(kind)) {
      // чистый — только рамка образца ниже
    } else {
      for (let gy = sy + step; gy < sy + sh; gy += step) {
        ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + sw, gy); ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = env.ink;
    ctx.lineWidth = Math.max(1, m * 0.005);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = env.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `400 ${m * 0.04}px ${SANS}`;
    ctx.fillText(env.ruling ? env.ruling.toLowerCase() : "чистый лист", cx, sy + sh + m * 0.03);
    ctx.restore();
  },
  // Фольга у тетради — тиснёный логотип в подвале: шильдик сверху занят полями
  // для подписи, а образец разлиновки перекрывать нельзя, он отвечает на выбор.
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "PM", x: r.x + r.w / 2, y: r.y + r.h * 0.87, size: m * 0.09, align: "center" }];
  },
};

// Выпускной альбом — фото-окно с силуэтами класса, «ВЫПУСК 2026», школа.
const yearbook: Cover = {
  content(ctx, r, env) {
    const m = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;

    heading(ctx, "ВЫПУСК", cx, r.y + r.h * 0.09, m * 0.1, env, SANS);

    const win: Rect = { x: r.x + r.w * 0.14, y: r.y + r.h * 0.26, w: r.w * 0.72, h: r.h * 0.44 };
    plate(ctx, win, env.ink, 0.16);
    // силуэты класса
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = env.ink;
    // фигура = голова + плечи одним контуром, иначе головы «отрываются»
    const n = 5;
    for (let i = 0; i < n; i++) {
      const hx = win.x + win.w * ((i + 0.5) / n);
      const hr = win.w * 0.042;
      const hy = win.y + win.h * 0.5;
      const shoulderY = hy + hr * 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - hr * 2.1, win.y + win.h);
      ctx.quadraticCurveTo(hx - hr * 1.9, shoulderY, hx - hr * 0.9, shoulderY - hr * 0.5);
      ctx.quadraticCurveTo(hx, shoulderY - hr * 1.2, hx + hr * 0.9, shoulderY - hr * 0.5);
      ctx.quadraticCurveTo(hx + hr * 1.9, shoulderY, hx + hr * 2.1, win.y + win.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    dieCutWindow(ctx, win, m * 0.015);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = env.ink;
    ctx.globalAlpha = 0.6;
    ctx.font = `600 ${m * 0.08}px ${SANS}`;
    ctx.fillText("2026", cx, r.y + r.h * 0.76);
    ctx.globalAlpha = 0.4;
    ctx.font = `400 ${m * 0.04}px ${SANS}`;
    ctx.fillText("школа № 1 · 11 «А»", cx, r.y + r.h * 0.88);
    ctx.restore();
  },
  accentMarks(r) {
    const m = Math.min(r.w, r.h);
    return [{ kind: "text", text: "ВЫПУСК", x: r.x + r.w / 2, y: r.y + r.h * 0.09, size: m * 0.1, align: "center", font: SANS }];
  },
};

// Газета — единственная сцена с полным self-render: у газеты нет ни обложки,
// ни переплёта, ни толщины блока. Сфальцованный пополам лист, мачта, колонки.
const newspaper: Cover = {
  content() {
    /* не используется — рисует render() */
  },
  // Фольги у газеты НЕТ, и это осознанно, а не забытая реализация: газетную
  // полосу печатают ротацией на газетной бумаге, фольгу там не припрессовывают.
  // Пустой список гасит и фолбэк движка — тот же приём, что у `sticker-qr`,
  // где фольга убила бы читаемость кода. Показывать сочетание, которого не
  // бывает в производстве, — врать пользователю.
  accentMarks: () => [],
  render(ctx, cssW, cssH, env) {
    const pad = Math.min(cssW, cssH) * 0.12;
    const availW = cssW - 2 * pad;
    const availH = cssH - 2 * pad;
    // газетная полоса — вытянутый портрет (A2/A3), кладём по высоте
    const aspect = (env.mm.w || 297) / (env.mm.h || 420);
    let h = availH;
    let w = h * aspect;
    if (w > availW) { w = availW; h = w / aspect; }
    const x = (cssW - w) / 2;
    const y = (cssH - h) / 2;
    const m = Math.min(w, h);

    // лист + тень
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.25)";
    ctx.shadowBlur = m * 0.08;
    ctx.shadowOffsetY = m * 0.03;
    ctx.fillStyle = "#f2ede1"; // газетная бумага всегда сероватая
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    const ink = "#22201c";
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const ix = x + w * 0.07;
    const iw = w * 0.86;

    // мачта
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `700 ${m * 0.13}px ${SERIF}`;
    ctx.fillText("ВЕСТНИК", x + w / 2, y + h * 0.05);

    ctx.globalAlpha = 0.55;
    ctx.font = `400 ${m * 0.032}px ${SANS}`;
    ctx.fillText("№ 128 · пятница, 24 июля 2026", x + w / 2, y + h * 0.155);
    ctx.globalAlpha = 1;

    // двойная линейка под мачтой
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, m * 0.008);
    ctx.beginPath();
    ctx.moveTo(ix, y + h * 0.2);
    ctx.lineTo(ix + iw, y + h * 0.2);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, m * 0.003);
    ctx.beginPath();
    ctx.moveTo(ix, y + h * 0.213);
    ctx.lineTo(ix + iw, y + h * 0.213);
    ctx.stroke();

    // передовица: фото + текст
    plate(ctx, { x: ix, y: y + h * 0.24, w: iw * 0.52, h: h * 0.18 }, ink, 0.22);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = ink;
    ctx.textAlign = "left";
    ctx.font = `700 ${m * 0.055}px ${SERIF}`;
    ctx.fillText("Событие дня", ix + iw * 0.56, y + h * 0.245);
    ctx.globalAlpha = 1;
    textLines(ctx, ix + iw * 0.56, y + h * 0.31, iw * 0.42, m * 0.012, 4, ink, 0.3);

    // три колонки
    const colY = y + h * 0.46;
    const colH = h * 0.46;
    const gap = iw * 0.05;
    const colW = (iw - gap * 2) / 3;
    for (let c = 0; c < 3; c++) {
      const colX = ix + c * (colW + gap);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = ink;
      ctx.font = `700 ${m * 0.033}px ${SERIF}`;
      ctx.textAlign = "left";
      ctx.fillText(["Город", "Культура", "Спорт"][c], colX, colY);
      ctx.restore();
      textLines(ctx, colX, colY + h * 0.05, colW, m * 0.009, 9, ink, 0.26, 0.6);
      if (c < 2) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(0.5, m * 0.003);
        ctx.beginPath();
        ctx.moveTo(colX + colW + gap / 2, colY);
        ctx.lineTo(colX + colW + gap / 2, colY + colH);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    // горизонтальный сгиб пополам — газету всегда фальцуют
    ctx.save();
    const fy = y + h * 0.5;
    const fold = ctx.createLinearGradient(0, fy - h * 0.03, 0, fy + h * 0.03);
    fold.addColorStop(0, "rgba(0,0,0,0)");
    fold.addColorStop(0.5, "rgba(0,0,0,.16)");
    fold.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fold;
    ctx.fillRect(x, fy - h * 0.03, w, h * 0.06);
    ctx.restore();

    // контур листа
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  },
};

export const covers: Record<string, Cover> = {
  booklet, book, catalog, magazine, photobook, planner, notepad, copybook,
  yearbook, newspaper,
};

// Фолбэк — брошюра (как `card` у листовых): пустой или неизвестный
// preview_kind не должен ронять превью.
export function getCover(kind?: string | null): Cover {
  return (kind && covers[kind]) || booklet;
}

// Имя переплёта из Directus → вид. Порядок проверок важен: «Твёрдый переплёт
// 7БЦ» ловим до клеевого, иначе слово «переплёт» ни о чём не скажет.
export function bindingKindOf(name: string | null | undefined): BindingKind {
  const n = name ?? "";
  if (/7\s*бц|тв[её]рд|hard/i.test(n)) return "hardcover";
  if (/пружин|spiral/i.test(n)) return "spiral";
  if (/кбс|клеев|glue/i.test(n)) return "glue";
  return "staple";
}
