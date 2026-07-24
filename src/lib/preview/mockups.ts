// Реестр макетов превью по продуктам. Каждый макет рисует ТОЛЬКО содержимое
// («рыбу»), а универсальные слои (контур, материя, глянец) даёт Preview.vue.
// Новый продукт со своей сценой = +1 запись здесь, движок не трогаем.
import type { AccentMark, Rect } from "./primitives";
import { roundRect } from "./primitives";

export type MockupEnv = {
  round: boolean;
  ink: string; // цвет краски печати (контраст к бумаге)
  foilOn: boolean;
  foilHex: string;
  foldCount: number; // число сгибов (буклеты) → панелей = foldCount + 1
  // Метка ВЫБРАННОГО размера как она заведена в каталоге. Нужна там, где размер
  // называет само изделие, а не только габарит: у POS-материалов плитки — это
  // «Ценник A7», «Воблер 80×80», «Хенгер дверной 95×280», то есть пользователь
  // выбирает размером, ЧТО он печатает. Сцены, которым это не нужно, поле
  // просто игнорируют.
  sizeLabel?: string;
};

export type Mockup = {
  // ink-слой (до глянца ламинации)
  content: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
  // ГДЕ на этой кукле лежит фольга. Сцена ОБЪЯВЛЯЕТ метки и не рисует металл
  // сама — как он блестит, знает движок (`drawAccentMarks`), чтобы фольга
  // выглядела одинаково на всех продуктах.
  //
  // Раньше здесь был `foil()`, который рисовал: из 26 сцен его реализовали 14,
  // и на бейджах, буклетах, открытках, билетах и POS-материалах галочка
  // «фольгирование» не давала в превью ничего. Метод остался необязательным,
  // но молчания больше нет — движок подставляет `defaultAccentMarks()`.
  accentMarks?: (r: Rect, env: MockupEnv) => AccentMark[];
  // Слой ПОСЛЕ фольги. Нужен ровно там, где эффект и есть изделие и обязан
  // накрывать металл: эпоксидный купол объёмной наклейки.
  afterFoil?: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
};

const pad = (r: Rect, round: boolean) => Math.min(r.w, r.h) * (round ? 0.2 : 0.1);

// Макет «визитка»: лого-монограмма, имя, должность, разделитель, контакты.
const card: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const round = env.round;
    const p = pad(r, round);
    const cx = x + w / 2;
    const anchorX = round ? cx : x + p;
    const fs = round ? 0.85 : 1; // мельче для круга
    const ink = env.ink;
    const lineH = h * 0.085 * fs;
    ctx.textAlign = round ? "center" : "left";

    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.textBaseline = "top";
      ctx.font = `700 ${Math.round(h * 0.18 * fs)}px Georgia, serif`;
      ctx.fillText("PM", anchorX, y + p);
    }

    ctx.textBaseline = "alphabetic";
    const contacts = ["+7 495 000-00-00", "mail@printmos.ru", "Москва, ул. Примерная, 1"];
    ctx.font = `400 ${Math.round(h * 0.07 * fs)}px system-ui, sans-serif`;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.8;
    const lastBaseline = y + h - p;
    contacts.forEach((t, i) => {
      ctx.fillText(t, anchorX, lastBaseline - (contacts.length - 1 - i) * lineH);
    });
    ctx.globalAlpha = 1;

    const dividerY = lastBaseline - (contacts.length - 1) * lineH - lineH * 1.25;
    const dw = round ? (w - 2 * p) * 0.7 : w - 2 * p;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, h * 0.005);
    ctx.beginPath();
    ctx.moveTo(cx - dw / 2, dividerY);
    ctx.lineTo(cx + dw / 2, dividerY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const titleBaseline = dividerY - h * 0.07 * fs;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.65;
    ctx.font = `400 ${Math.round(h * 0.075 * fs)}px system-ui, sans-serif`;
    ctx.fillText("Менеджер по печати", anchorX, titleBaseline);
    ctx.globalAlpha = 1;
    ctx.font = `700 ${Math.round(h * 0.12 * fs)}px system-ui, sans-serif`;
    ctx.fillText("Иван Петров", anchorX, titleBaseline - h * 0.105 * fs);
  },
  accentMarks(r, env) {
    const { x, y, w, h } = r;
    const p = pad(r, env.round);
    const size = Math.round(h * 0.18 * (env.round ? 0.85 : 1));
    return [{
      kind: "text", text: "PM", size,
      x: env.round ? x + w / 2 : x + p, y: y + p,
      align: env.round ? "center" : "left",
    }];
  },
};

// Макет «наклейка»: крупный центрированный знак + подпись (под любую форму).
const sticker: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const m = Math.min(w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!env.foilOn) {
      ctx.fillStyle = env.ink;
      ctx.font = `800 ${Math.round(m * 0.34)}px Georgia, serif`;
      ctx.fillText("PM", cx, cy - h * 0.04);
    }
    ctx.fillStyle = env.ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `600 ${Math.round(m * 0.09)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", cx, cy + h * 0.22);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    const size = Math.round(Math.min(w, h) * 0.34);
    return [{ kind: "text", text: "PM", x: x + w / 2, y: y + h / 2 - h * 0.04 - size / 2, size, align: "center" }];
  },
};

// Эпоксидный купол поверх печати: смола преломляет свет у края (тёмный ободок),
// собирает крупный мягкий блик и даёт узкий пересвет-серп по верхней кромке.
// Рисуется прямоугольниками — форму (круг/скругление) даёт clip из Preview.vue.
function resinDome(ctx: CanvasRenderingContext2D, r: Rect, round: boolean) {
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const m = Math.min(w, h);

  // Тело линзы: свет падает сверху-слева, поэтому противоположный край уходит в
  // тень — без этого купол не читается на белой основе (белый блик по белому).
  const body = ctx.createLinearGradient(x, y, x + w * 0.75, y + h);
  body.addColorStop(0, "rgba(255,255,255,0.22)");
  body.addColorStop(0.45, "rgba(20,26,34,0)");
  body.addColorStop(1, "rgba(20,26,34,0.28)");
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  // Край линзы: смола заворачивается и собирает тень по периметру. Форма спада
  // должна повторять изделие: у круга — кольцом, у прямоугольника — вдоль
  // четырёх сторон (радиальный градиент на вытянутом изделии даёт не купол, а
  // грязную виньетку по торцам).
  if (round) {
    const rim = ctx.createRadialGradient(cx, cy, m * 0.16, cx, cy, m * 0.5);
    rim.addColorStop(0, "rgba(0,0,0,0)");
    rim.addColorStop(0.62, "rgba(20,26,34,0.07)");
    rim.addColorStop(0.88, "rgba(20,26,34,0.3)");
    rim.addColorStop(1, "rgba(12,16,22,0.5)");
    ctx.fillStyle = rim;
    ctx.fillRect(x, y, w, h);
  } else {
    const band = m * 0.22; // ширина заворота смолы у борта
    const edge = (
      x0: number, y0: number, x1: number, y1: number, a: number,
    ) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(12,16,22,${a})`);
      g.addColorStop(0.55, "rgba(20,26,34,0.05)");
      g.addColorStop(1, "rgba(20,26,34,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };
    edge(x, y, x + band, y, 0.3); // левый борт
    edge(x + w, y, x + w - band, y, 0.42); // правый (в тени)
    edge(x, y, x, y + band, 0.22); // верхний
    edge(x, y + h, x, y + h - band, 0.42); // нижний (в тени)
  }

  // основной блик — компактный и яркий, смещён вверх-влево
  const specR = m * 0.34;
  const spec = ctx.createRadialGradient(
    cx - w * 0.17, cy - h * 0.19, m * 0.01,
    cx - w * 0.17, cy - h * 0.19, specR,
  );
  spec.addColorStop(0, "rgba(255,255,255,0.92)");
  spec.addColorStop(0.35, "rgba(255,255,255,0.3)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(x, y, w, h);

  // Мягкое пятно света: радиальный градиент в сплюснутых координатах — даёт
  // овал с размытым краем (у ellipse+fill край жёсткий и читается как грязь).
  const softOval = (
    ox: number, oy: number, rx: number, ry: number, tilt: number, alpha: number,
  ) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(tilt);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.35})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Серп-пересвет по верхней кромке и отражённый свет по нижней. Размер вести от
  // меньшей стороны: от ширины — на вытянутом изделии пятно расплывается во всю
  // длину и читается как грязь, а не как блик.
  softOval(cx - m * 0.04, y + h * 0.24, m * 0.4, m * 0.13, -0.3, 0.8);
  softOval(cx + m * 0.08, y + h * 0.84, m * 0.32, m * 0.08, 0.22, 0.34);
}

// Макет «объёмная наклейка со смолой»: та же «рыба», что у наклейки, но под
// эпоксидной линзой — купол и есть продукт, поэтому рисуем его здесь, а не
// оставляем на слой глянца (ламинация даёт плоский блик, купол — объём).
const volumeSticker: Mockup = {
  content(ctx, r, env) {
    sticker.content(ctx, r, env);
    resinDome(ctx, r, env.round);
  },
  // Фольга лежит ПОД смолой: движок кладёт металл по меткам наклейки, а купол
  // возвращается сверху через afterFoil. Единственная сцена, которой нужен свой
  // слой ПОСЛЕ фольги, — потому что купол и есть само изделие.
  accentMarks: sticker.accentMarks,
  afterFoil(ctx, r, env) {
    resinDome(ctx, r, env.round);
  },
};

// Звезда — одна из форм в стикерпаке (нужна, чтобы россыпь читалась как набор
// РАЗНЫХ вырубок, а не как сетка одинаковых кружков).
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? R * 0.45 : R;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// Макет «стикерпак» (кластер /stickers/sticker-packs): изделие — не одна
// наклейка, а ЛИСТ с россыпью разных вырубленных стикеров. Поэтому у него своя
// сцена, а не куклы `sticker`: движок вывести это из материала не может.
// Белое поле реза и пунктир каждая наклейка несёт сама (внешний край листа
// остаётся ровным — см. STICKER_KINDS в Preview.vue).
// Раскладка стикерпака вынесена из сцены: её должны видеть И `content`, И
// `accentMarks` — иначе метки фольги разъедутся с вырубками при первой же правке
// сетки, а поймать это можно только глазами.
type PackCell = { cx: number; cy: number; R: number; kind: "circle" | "rect" | "star" };
function packCells(r: Rect): PackCell[] {
  const { x, y, w, h } = r;
  // Сетка от пропорции листа, а не жёсткая 3×2: дефолтный размер наклейки —
  // 50×50 мм, и шесть штук на квадрате вырождаются в нечитаемую мелочь.
  const ratio = w / h;
  const [cols, rows] = ratio > 1.35 ? [3, 2] : ratio < 0.75 ? [2, 3] : [2, 2];
  const cw = w / cols, ch = h / rows;
  const R = Math.min(cw, ch) * 0.38;
  // Формы по ячейкам + разброс центра: на производстве стикеры раскладывают
  // плотно и вразнобой, ровная сетка выглядит как лист этикеток.
  const kinds = ["circle", "rect", "star", "rect", "star", "circle"] as const;
  const jitter = [
    [0.02, -0.04], [-0.05, 0.05], [0.04, 0.03],
    [-0.03, -0.05], [0.05, -0.02], [-0.02, 0.04],
  ];
  return Array.from({ length: cols * rows }, (_, i) => ({
    cx: x + ((i % cols) + 0.5) * cw + cw * jitter[i][0],
    cy: y + (Math.floor(i / cols) + 0.5) * ch + ch * jitter[i][1],
    R,
    kind: kinds[i],
  }));
}

const stickerPack: Mockup = {
  content(ctx, r, env) {
    const ink = env.ink;
    for (const { cx, cy, R, kind } of packCells(r)) {
      // Белое поле реза (die-cut) под стикером. Тень обязательна: без неё белая
      // подложка на кремовой бумаге не видна вовсе, и лист читается как пустой
      // с редкими значками — проверено на живом превью 339×224.
      ctx.save();
      const shape = () => {
        if (kind === "circle") {
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        } else if (kind === "star") {
          starPath(ctx, cx, cy, R);
        } else {
          roundRect(ctx, cx - R, cy - R * 0.78, R * 2, R * 1.56, R * 0.3);
        }
      };
      ctx.shadowColor = "rgba(0,0,0,.28)";
      ctx.shadowBlur = R * 0.3;
      ctx.shadowOffsetY = R * 0.1;
      shape();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      ctx.save();
      shape();
      ctx.setLineDash([R * 0.18, R * 0.14]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,.45)";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ink внутри вырубки: монограмма в круге/звезде, две строки в плашке
      ctx.save();
      ctx.fillStyle = ink;
      if (kind === "rect") {
        ctx.globalAlpha = 0.55;
        ctx.fillRect(cx - R * 0.6, cy - R * 0.2, R * 1.2, Math.max(1, R * 0.14));
        ctx.globalAlpha = 0.28;
        ctx.fillRect(cx - R * 0.42, cy + R * 0.15, R * 0.84, Math.max(1, R * 0.1));
      } else {
        ctx.globalAlpha = 0.85;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // в звезде монограмма мельче — иначе выходит за лучи
        ctx.font = `800 ${Math.round(R * (kind === "star" ? 0.38 : 0.62))}px Georgia, serif`;
        ctx.fillText("PM", cx, cy);
      }
      ctx.restore();
    }
  },
  // Фольгируются монограммы в КРУГЛЫХ вырубках: золотить весь лист неправдоподобно
  // (фольга идёт акцентом), а круг — самая крупная и читаемая вырубка в паке.
  accentMarks(r) {
    return packCells(r)
      .filter((c) => c.kind === "circle")
      .map((c) => {
        const size = Math.round(c.R * 0.62);
        return {
          kind: "text" as const, text: "PM",
          x: c.cx, y: c.cy - size * 0.52, size, align: "center" as const,
        };
      });
  },
};

// QR-матрица: три поисковых квадрата по углам + модули из LCG с ФИКСИРОВАННЫМ
// семенем. Math.random дал бы новый узор на каждый кадр (и другой — в снимке
// корзины). Поисковый квадрат рисуем обводкой в толщину модуля + центром 3×3:
// вырезать «белое» нечем — под нами бумага, а её цвет сцене не передаётся.
function qrMatrix(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, ink: string,
) {
  const N = 21; // QR версии 1
  const cell = size / N;
  let seed = 20260723;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  const inFinder = (i: number, j: number) =>
    (i < 8 && j < 8) || (i > N - 9 && j < 8) || (i < 8 && j > N - 9);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      if (inFinder(i, j)) continue;
      if (rnd() > 0.5) ctx.fillRect(x + i * cell, y + j * cell, cell, cell);
    }
  }

  ctx.lineWidth = cell;
  for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
    ctx.strokeRect(x + (fx + 0.5) * cell, y + (fy + 0.5) * cell, cell * 6, cell * 6);
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3);
  }
  ctx.restore();
}

// Макет «наклейка с QR» (кластер /stickers/qr): весь смысл изделия — код,
// который сканируют, поэтому он занимает наклейку целиком, а бренд уходит в
// подпись. Фольга сюда не идёт: фольгированный QR не читается сканером.
const stickerQr: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const m = Math.min(w, h);
    const size = m * (env.round ? 0.5 : 0.6);
    qrMatrix(ctx, x + (w - size) / 2, y + h * 0.5 - size * 0.58, size, env.ink);

    ctx.save();
    ctx.fillStyle = env.ink;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `600 ${Math.round(m * 0.09)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", x + w / 2, y + h * 0.5 + size * 0.5);
    ctx.restore();
  },
  // Фольгируется ТОЛЬКО подпись, не код: фольгированный QR бликует и перестаёт
  // читаться сканером — этого в превью показывать нельзя, чтобы не продавать
  // заведомо нерабочее сочетание.
  accentMarks(r, env) {
    const { x, y, w, h } = r;
    const m = Math.min(w, h);
    const qr = m * (env.round ? 0.5 : 0.6);
    return [{
      kind: "text", text: "PRINTMOS", x: x + w / 2, y: y + h * 0.5 + qr * 0.5,
      size: Math.round(m * 0.09), align: "center", font: SANS,
    }];
  },
};

// Макет «буклет/листовка»: контент колонками по числу панелей (foldCount+1).
// Каждая панель — плашка изображения сверху, заголовок, строки текста (нечитаемо,
// но обозначает структуру). Линии сгиба рисует Preview.vue поверх.
const leaflet: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const panels = Math.max(1, (env.foldCount || 0) + 1);
    const pw = w / panels;
    const pad = Math.min(pw, h) * 0.08;
    for (let i = 0; i < panels; i++) {
      const px = x + i * pw + pad;
      const innerW = pw - 2 * pad;
      ctx.fillStyle = env.ink;
      // плашка изображения
      ctx.globalAlpha = 0.14;
      ctx.fillRect(px, y + pad, innerW, h * 0.3);
      // заголовок
      ctx.globalAlpha = 0.6;
      ctx.fillRect(px, y + h * 0.42, innerW * 0.7, Math.max(2, h * 0.03));
      // абзац
      ctx.globalAlpha = 0.32;
      const lh = h * 0.06;
      for (let l = 0; l < 4; l++) {
        ctx.fillRect(px, y + h * 0.52 + l * lh, innerW * (l === 3 ? 0.5 : 0.95), Math.max(1, h * 0.02));
      }
      ctx.globalAlpha = 1;
    }
  },
  // Фольгируется заголовок ПЕРВОЙ панели — она лицевая при любой фальцовке.
  // Локальная переменная названа gap, а не pad: модульный pad() — это функция.
  accentMarks(r, env) {
    const { x, y, w, h } = r;
    const pw = w / Math.max(1, (env.foldCount || 0) + 1);
    const gap = Math.min(pw, h) * 0.08;
    return [{
      kind: "rect", x: x + gap, y: y + h * 0.42,
      w: (pw - 2 * gap) * 0.7, h: Math.max(2, h * 0.03),
    }];
  },
};

// Макет «фирменный бланк/документ»: лого + реквизиты в шапке, разделитель,
// строки текста письма. Шрифты масштабируются от ШИРИНЫ (не высоты) — иначе на
// портретном A4 буквы вылезают за край (баг макета `card` на бланках).
const letterhead: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const p = w * 0.1;
    const ink = env.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // лого PM (если не фольга — её рисует foil-слой)
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(w * 0.11)}px Georgia, serif`;
      ctx.fillText("PM", x + p, y + p);
    }

    // название + реквизиты справа в шапке
    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.78;
    ctx.font = `700 ${Math.round(w * 0.045)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", x + w - p, y + p);
    ctx.globalAlpha = 0.5;
    ctx.font = `400 ${Math.round(w * 0.032)}px system-ui, sans-serif`;
    ["ООО «Принтмос»", "ИНН 7700000000", "+7 495 000-00-00"].forEach((t, i) =>
      ctx.fillText(t, x + w - p, y + p + w * 0.08 + i * w * 0.045),
    );
    ctx.globalAlpha = 1;

    // разделитель под шапкой
    const hy = y + p + w * 0.24;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(x + p, hy);
    ctx.lineTo(x + w - p, hy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // строки текста письма (нечитаемо, обозначают документ)
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.22;
    const lh = h * 0.04;
    const startY = hy + h * 0.05;
    const rows = Math.max(0, Math.min(14, Math.floor((y + h - p - startY) / lh)));
    for (let i = 0; i < rows; i++) {
      const ww = i % 4 === 3 ? 0.45 : 0.92;
      ctx.fillRect(x + p, startY + i * lh, (w - 2 * p) * ww, Math.max(1, h * 0.011));
    }
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w } = r;
    return [{ kind: "text", text: "PM", x: x + w * 0.1, y: y + w * 0.1, size: Math.round(w * 0.11) }];
  },
};

// Макет «конверт» (лицевая сторона): кромка клапана, лого + обратный адрес
// слева вверху, рамка под марку справа вверху, адрес получателя справа внизу.
// Все форматы конвертов (Евро/DL, C6, C5, C4) — альбомные, композиция одна.
// Шрифты масштабируются от МЕНЬШЕЙ стороны: у DL пропорция 2:1, и масштаб от
// ширины разнёс бы текст за края (тот же баг, что у `card` на бланках).
const envelope: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.09;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // кромка клапана: линия нахлёста по верхнему краю + мягкая тень под ней —
    // без неё лицо конверта читается просто как карточка
    const flapY = y + h * 0.1;
    const shade = ctx.createLinearGradient(0, flapY, 0, flapY + h * 0.07);
    shade.addColorStop(0, "rgba(0,0,0,.12)");
    shade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(x, flapY, w, h * 0.07);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(1, u * 0.008);
    ctx.beginPath();
    ctx.moveTo(x, flapY);
    ctx.lineTo(x + w, flapY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const topY = y + h * 0.17;

    // лого PM (если фольга — его рисует foil-слой)
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(u * 0.2)}px Georgia, serif`;
      ctx.fillText("PM", x + p, topY);
    }

    // обратный адрес отправителя под лого
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `400 ${Math.round(u * 0.075)}px system-ui, sans-serif`;
    ["ООО «Принтмос»", "Москва, ул. Примерная, 1"].forEach((t, i) =>
      ctx.fillText(t, x + p, topY + u * 0.24 + i * u * 0.1),
    );
    ctx.globalAlpha = 1;

    // рамка под марку — правый верхний угол
    const mw = w * 0.12;
    const mh = Math.min(mw * 1.3, h * 0.26);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, u * 0.006);
    ctx.setLineDash([u * 0.03, u * 0.02]);
    ctx.strokeRect(x + w - p - mw, topY, mw, mh);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // адрес получателя — строки в правой нижней четверти (нечитаемо, обозначает блок)
    const bx = x + w * 0.5;
    const bw = w * 0.5 - p;
    const lh = h * 0.09;
    const lastY = y + h - p - h * 0.03;
    ctx.fillStyle = ink;
    [0.62, 0.9, 0.75, 0.5].forEach((ww, i) => {
      ctx.globalAlpha = i === 0 ? 0.55 : 0.28;
      ctx.fillRect(bx, lastY - (3 - i) * lh, bw * ww, Math.max(1, h * 0.03));
    });
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    return [{ kind: "text", text: "PM", x: x + u * 0.09, y: y + h * 0.17, size: Math.round(u * 0.2) }];
  },
};

// Макет «крупноформат» (плакат/баннер/холст/роллап/афиша): большое поле
// изображения сверху, крупный заголовок, подзаголовок и акцентная плашка снизу.
// Пропорции любые (портрет плаката ↔ ландшафт баннера) — всё от меньшей стороны.
const poster: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.08;
    const iw = w - 2 * p;

    // поле изображения — верхние ~55%
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x + p, y + p, iw, h * 0.5);
    // диагональ-«слэш» внутри поля, чтобы читалось как макет-плейсхолдер
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = Math.max(1, u * 0.01);
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(x + p, y + p);
    ctx.lineTo(x + p + iw, y + p + h * 0.5);
    ctx.moveTo(x + p + iw, y + p);
    ctx.lineTo(x + p, y + p + h * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // крупный заголовок
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `800 ${Math.round(u * 0.16)}px system-ui, sans-serif`;
      ctx.fillText("PRINTMOS", x + p, y + h * 0.6);
    }
    // подзаголовок + строка
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
    ctx.fillText("Широкоформатная печать", x + p, y + h * 0.6 + u * 0.19);
    ctx.globalAlpha = 1;
    // акцентная плашка снизу
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + p, y + h - p - u * 0.06, iw * 0.4, u * 0.06);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    return [{ kind: "text", text: "PRINTMOS", x: x + u * 0.08, y: y + h * 0.6, size: Math.round(u * 0.16), font: SANS }];
  },
};

// Макет «бирка/ярлык» (hang-tag): люверс-отверстие со шнурком у верхнего края,
// лого и «цена»/строки ниже. Форму (в т.ч. скруглённую) задаёт Preview.
const tag: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;
    ctx.textAlign = "center";

    // люверс: кольцо у верхнего края + короткий шнурок
    const holeY = y + h * 0.13;
    const rad = u * 0.06;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1.5, u * 0.02);
    ctx.beginPath();
    ctx.arc(cx, holeY, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, holeY - rad);
    ctx.lineTo(cx - u * 0.05, y + u * 0.01);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // лого
    ctx.textBaseline = "middle";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `800 ${Math.round(u * 0.24)}px Georgia, serif`;
      ctx.fillText("PM", cx, y + h * 0.45);
    }
    // подпись/строки
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `600 ${Math.round(u * 0.09)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", cx, y + h * 0.68);
    ctx.globalAlpha = 0.3;
    ctx.font = `400 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
    ctx.fillText("артикул · размер", cx, y + h * 0.82);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    const size = Math.round(Math.min(w, h) * 0.24);
    return [{ kind: "text", text: "PM", x: x + w / 2, y: y + h * 0.45 - size / 2, size, align: "center" }];
  },
};

// Макет «табличка/знак» (кабинетная/информационная/указатель/безопасности):
// рамка по краю, пиктограмма-плейсхолдер сверху, 1–2 центрированные строки.
const sign: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;
    const p = u * 0.12;

    // внутренняя рамка
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1.5, u * 0.015);
    ctx.strokeRect(x + p * 0.5, y + p * 0.5, w - p, h - p);
    ctx.globalAlpha = 1;

    // пиктограмма — скруглённый квадрат по центру-верху
    const ic = u * 0.28;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.16;
    roundRect(ctx, cx - ic / 2, y + h * 0.2, ic, ic, ic * 0.16);
    ctx.fill();
    ctx.globalAlpha = 1;

    // две центрированные строки
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(u * 0.14)}px system-ui, sans-serif`;
      ctx.fillText("101", cx, y + h * 0.56);
    }
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.font = `500 ${Math.round(u * 0.08)}px system-ui, sans-serif`;
    ctx.fillText("Кабинет", cx, y + h * 0.56 + u * 0.16);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    return [{
      kind: "text", text: "101", x: x + w / 2, y: y + h * 0.56,
      size: Math.round(Math.min(w, h) * 0.14), align: "center", font: SANS,
    }];
  },
};

// Макет «папка» (presentation folder): готовая папка с лица — корешок слева,
// лого на обложке, внутренний карман нижней третью с ПОЛУКРУГЛЫМ ВЫРЕЗОМ под
// палец. Вырез — главный опознавательный знак: без него папка неотличима от
// листа с диагональю (так и было — плитка каталога читалась как визитка).
// Корешок даёт объём: папка вкладная, а не сфальцованный лист.
const folder: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.1;
    // Корешок — узкая полоса у левого края. От ШИРИНЫ, а не от меньшей стороны:
    // в каталоге у папок заведена развёртка 440×320 (ландшафт), и доля от
    // высоты дала бы там корешок в треть листа.
    const spine = w * 0.055;
    const lx = x + spine;

    // корешок: лёгкая заливка + линия сгиба
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.07;
    ctx.fillRect(x, y, spine, h);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, u * 0.006);
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + h);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // лого на обложке
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(u * 0.16)}px Georgia, serif`;
      ctx.fillText("PM", lx + p, y + p);
    }
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", lx + p, y + p + u * 0.19);
    ctx.globalAlpha = 1;

    // карман: кромка с вырезом под палец, дальше — вниз до нижнего края
    const py = y + h * 0.62;
    const nr = Math.min(u * 0.14, (w - spine) * 0.22); // радиус выреза
    const cx = lx + (w - spine) * 0.5;
    const pocket = () => {
      ctx.beginPath();
      ctx.moveTo(lx, py);
      ctx.lineTo(cx - nr, py);
      // дуга ВНИЗ, в тело кармана (anticlockwise: PI → 0 через 0.5PI)
      ctx.arc(cx, py, nr, Math.PI, 0, true);
      ctx.lineTo(x + w, py);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(lx, y + h);
      ctx.closePath();
    };
    pocket();
    ctx.fillStyle = ink;
    // 0.10, а не 0.14: на плитке каталога заливка выше 13% уходит в хафтон, и
    // карман становился крупным точечным пятном, забивающим и вырез, и прорезь.
    ctx.globalAlpha = 0.1;
    ctx.fill();
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = Math.max(1, u * 0.008);
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // прорезь под визитку в кармане — деталь, которая читается даже мелко
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1, u * 0.006);
    ctx.beginPath();
    const sx = lx + (w - spine) * 0.12, sw = (w - spine) * 0.26, sy = y + h * 0.82;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w } = r;
    const u = Math.min(r.w, r.h);
    return [{
      kind: "text", text: "PM",
      x: x + w * 0.055 + u * 0.1, y: y + u * 0.1, size: Math.round(u * 0.16),
    }];
  },
};

// Макет «бланк/БСО» (forms): условное лого + серия/№ строгой отчётности в рамке,
// заголовок, поля «метка → линия», компактная таблица, подпись и «М.П.». Один
// образ закрывает кластеры БСО / самокопир. / фирменные. Рисуем ТОЛЬКО ink-
// контент — бумага/текстура/глянец/фольга едины для всех сцен (даёт Preview.vue).
// Пропорция A4-портрет: шрифты от меньшей стороны (= ширина), как у letterhead.
const forms: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const m = w * 0.09;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // лого PM (условное — «фирменные»); при фольге рисует foil-слой
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(w * 0.1)}px Georgia, serif`;
      ctx.fillText("PM", x + m, y + m);
    }

    // серия/№ строгой отчётности в рамке — правый верх (главный признак БСО)
    const bw = w * 0.34, bh = h * 0.055, bx = x + w - m - bw, by = y + m;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.max(1, u * 0.006);
    roundRect(ctx, bx, by, bw, bh, bh * 0.15);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(w * 0.032)}px system-ui, sans-serif`;
    ctx.fillText("Серия АА  № 000123", bx + bw * 0.06, by + bh * 0.28);
    ctx.globalAlpha = 1;

    // заголовок-плашка по центру + подзаголовок
    const ty = y + h * 0.17;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x + w / 2 - w * 0.22, ty, w * 0.44, h * 0.022);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + w / 2 - w * 0.13, ty + h * 0.035, w * 0.26, h * 0.012);
    ctx.globalAlpha = 1;

    // разделитель
    const dy = ty + h * 0.075;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, u * 0.005);
    ctx.beginPath();
    ctx.moveTo(x + m, dy);
    ctx.lineTo(x + w - m, dy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // поля бланка: метка + линия
    const rows = 5, rh = h * 0.062, ry0 = dy + h * 0.04;
    for (let i = 0; i < rows; i++) {
      const ry = ry0 + i * rh;
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + m, ry, w * (i % 2 ? 0.16 : 0.2), Math.max(1, h * 0.014));
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(x + m + w * 0.26, ry + h * 0.02);
      ctx.lineTo(x + w - m, ry + h * 0.02);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // компактная таблица 3×2 (сумма/кол-во) — усиливает «бланк»
    const tx = x + m, tw = w - 2 * m, tY = ry0 + rows * rh + h * 0.01, tH = h * 0.11;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, tY, tw, tH);
    for (let c = 1; c < 3; c++) {
      ctx.beginPath();
      ctx.moveTo(tx + (tw * c) / 3, tY);
      ctx.lineTo(tx + (tw * c) / 3, tY + tH);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(tx, tY + tH / 2);
    ctx.lineTo(tx + tw, tY + tH / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // подвал: линия подписи слева + «М.П.» справа
    const fy = y + h - m - h * 0.02;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x + m, fy);
    ctx.lineTo(x + m + w * 0.34, fy);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([u * 0.02, u * 0.015]);
    ctx.beginPath();
    ctx.arc(x + w - m - w * 0.09, fy - h * 0.01, w * 0.075, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = `500 ${Math.round(w * 0.03)}px system-ui, sans-serif`;
    ctx.fillText("М.П.", x + w - m - w * 0.09, fy - h * 0.022);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w } = r;
    return [{ kind: "text", text: "PM", x: x + w * 0.09, y: y + w * 0.09, size: Math.round(w * 0.1) }];
  },
};

// Макет «визитка» (business-card): двухзонная композиция — брендовая шапка
// (монограмма + вордмарк + тэглайн) над разделителем, персона + контакты под ним,
// плюс тонкая кайма-рамка. Различия кластеров (ламинация/УФ/фольга/металл/пластик/
// круглая) даёт движок материалом и формой — кукла одна. Только ink-контент.
const businessCard: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const round = env.round;
    const u = Math.min(w, h);
    // Поле до текста. У прямоугольной было 0.11 при кайме на 0.55 от него —
    // между текстом и рамкой оставалось ~4 px в размере плитки каталога, и
    // композиция читалась обрезанной. Поле и кайму развели: рамка ближе к краю,
    // текст — дальше внутрь.
    const pd = u * (round ? 0.14 : 0.15);
    const fi = u * 0.06; // отступ каймы от края изделия
    const cx = x + w / 2;

    // Круглая визитка — центрированная композиция.
    if (round) {
      ctx.textAlign = "center";
      if (!env.foilOn) {
        ctx.fillStyle = ink;
        ctx.textBaseline = "top";
        ctx.font = `700 ${Math.round(u * 0.2)}px Georgia, serif`;
        ctx.fillText("PM", cx, y + h * 0.2);
      }
      ctx.fillStyle = ink;
      ctx.textBaseline = "alphabetic";
      ctx.font = `700 ${Math.round(u * 0.1)}px system-ui, sans-serif`;
      ctx.fillText("Иван Петров", cx, y + h * 0.56);
      ctx.globalAlpha = 0.6;
      ctx.font = `400 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
      ctx.fillText("Менеджер по печати", cx, y + h * 0.65);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, u * 0.004);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.18, y + h * 0.7);
      ctx.lineTo(cx + w * 0.18, y + h * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.font = `400 ${Math.round(u * 0.055)}px system-ui, sans-serif`;
      ctx.fillText("+7 495 000-00-00", cx, y + h * 0.79);
      ctx.globalAlpha = 1;
      return;
    }

    // Прямоугольная: тонкая кайма-рамка (премиальность).
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = Math.max(1, u * 0.008);
    roundRect(ctx, x + fi, y + fi, w - fi * 2, h - fi * 2, u * 0.04);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Верх: монограмма слева (при фольге рисует foil-слой) + бренд справа.
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(h * 0.2)}px Georgia, serif`;
      ctx.fillText("PM", x + pd, y + pd);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.75;
    ctx.font = `600 ${Math.round(h * 0.07)}px system-ui, sans-serif`;
    ctx.fillText("P R I N T M O S", x + w - pd, y + pd + h * 0.02);
    ctx.globalAlpha = 0.4;
    ctx.font = `400 ${Math.round(h * 0.05)}px system-ui, sans-serif`;
    ctx.fillText("типография", x + w - pd, y + pd + h * 0.12);
    ctx.globalAlpha = 1;

    // Разделитель.
    const dy = y + h * 0.52;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1, u * 0.005);
    ctx.beginPath();
    ctx.moveTo(x + pd, dy);
    ctx.lineTo(x + w - pd, dy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Низ: имя + должность слева.
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ink;
    ctx.font = `700 ${Math.round(h * 0.125)}px system-ui, sans-serif`;
    ctx.fillText("Иван Петров", x + pd, dy + h * 0.17);
    ctx.globalAlpha = 0.6;
    ctx.font = `400 ${Math.round(h * 0.072)}px system-ui, sans-serif`;
    ctx.fillText("Менеджер по печати", x + pd, dy + h * 0.3);
    ctx.globalAlpha = 1;

    // Контакты справа: 3 строки в пределах нижнего поля.
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ink;
    ctx.font = `400 ${Math.round(h * 0.06)}px system-ui, sans-serif`;
    ["+7 495 000-00-00", "mail@printmos.ru", "printmos.ru"].forEach((t, i) =>
      ctx.fillText(t, x + w - pd, dy + h * 0.15 + i * h * 0.095),
    );
    ctx.globalAlpha = 1;
  },
  accentMarks(r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    return env.round
      ? [{ kind: "text", text: "PM", x: x + w / 2, y: y + h * 0.2, size: Math.round(u * 0.2), align: "center" }]
      : [{ kind: "text", text: "PM", x: x + u * 0.15, y: y + u * 0.15, size: Math.round(h * 0.2) }];
  },
};

// Макет «наградной документ»: двойная рамка, эмблема-медальон, ЗАГОЛОВОК-слово,
// вводная строка, линия имени, печать и подпись. Четыре продукта — грамота,
// сертификат, диплом, благодарность — физически идентичны по БУМАГЕ, но в
// каталоге четыре одинаковые плитки не читаются. Настоящее различие между этими
// документами — не форма, а ТЕКСТ: заголовочное слово и вводная фраза. Поэтому
// сцена — фабрика: общий макет, свой заголовок + одна достоверная деталь на
// продукт. Ключи сцен (`award`/`certificate`/`diploma`/`gratitude`) назначаются
// полем `preview_kind`; грамота осталась на историческом `award`.
const AWARD_SERIF = "Georgia, serif";
// Кегль заголовка-акцента (у благодарности без медальона заголовок и ЕСТЬ
// акцент). Его нельзя подобрать через fitFont: `accentMarks` рисует ту же
// строку, но ctx для замера у него нет, а движок обязан положить металл ровно
// туда, где сцена молчит. Поэтому — чистая оценка от ДЛИНЫ слова, одинаковая в
// обоих местах. «БЛАГОДАРНОСТЬ» (13 знаков) при прежней константе 0.088 не
// влезала на портретном A4; коэффициент 0.64 на знак — консервативная ширина
// жирного serif-кириллического глифа, так что слово гарантированно в рамке.
// Кап 0.095·u держит короткие слова («ГРАМОТА») от раздувания; всё ниже DOMINANT.
function awardTitleSize(title: string, u: number, w: number): number {
  const byWidth = (w * 0.58) / (title.length * 0.64);
  return Math.round(Math.min(u * 0.095, byWidth));
}

type AwardOpts = {
  title: string;
  intro: string;
  subline?: string | null; // достоверная деталь: «№ 00123» / «I МЕСТО»
  medallion?: boolean; // эмблема сверху; по умолчанию есть
};

function makeAward(o: AwardOpts): Mockup {
  const medallion = o.medallion !== false;
  // Без медальона акцентный элемент — сам заголовок (иначе плитке нечего красить
  // и нечего фольгировать). Тогда заголовок рисует движок по `foilOn`.
  const titleIsAccent = !medallion;
  return {
    content(ctx, r, env) {
      const { x, y, w, h } = r;
      const ink = env.ink;
      const u = Math.min(w, h);
      const cx = x + w / 2;
      const p = u * 0.09;

      // двойная рамка
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1, u * 0.01);
      ctx.strokeRect(x + p, y + p, w - 2 * p, h - 2 * p);
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = Math.max(1, u * 0.004);
      ctx.strokeRect(x + p * 1.5, y + p * 1.5, w - 3 * p, h - 3 * p);
      ctx.globalAlpha = 1;

      // эмблема-медальон (кольцо + PM; при фольге PM рисует движок как акцент)
      if (medallion) {
        const ey = y + h * 0.2, er = u * 0.08;
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(1, u * 0.008);
        ctx.beginPath();
        ctx.arc(cx, ey, er, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (!env.foilOn) {
          ctx.fillStyle = ink;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `700 ${Math.round(er * 1.1)}px ${AWARD_SERIF}`;
          ctx.fillText("PM", cx, ey + er * 0.05);
        }
      }

      // заголовок-СЛОВО. Если он же акцент (без медальона) и включён foilOn —
      // молчим, его положит движок ровно тем же кеглем (см. AWARD_TITLE).
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const titleTop = y + h * 0.3;
      if (!(titleIsAccent && env.foilOn)) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.85;
        const ts = titleIsAccent
          ? awardTitleSize(o.title, u, w)
          : fitFont(ctx, o.title, w * 0.64, u * 0.1, "700", AWARD_SERIF);
        ctx.font = `700 ${ts}px ${AWARD_SERIF}`;
        ctx.fillText(o.title, cx, titleTop);
        ctx.globalAlpha = 1;
      }

      // достоверная деталь: номер сертификата / место диплома
      let introY = y + h * 0.42;
      if (o.subline) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.6;
        ctx.font = `600 ${Math.round(u * 0.045)}px ${SANS}`;
        ctx.fillText(o.subline, cx, y + h * 0.41);
        ctx.globalAlpha = 1;
        introY = y + h * 0.47;
      }

      // вводная фраза (fitFont — «настоящим удостоверяется» длиннее «награждается»)
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.42;
      const is = fitFont(ctx, o.intro, w * 0.62, u * 0.05, "400", SANS);
      ctx.font = `400 ${is}px ${SANS}`;
      ctx.fillText(o.intro, cx, introY);
      ctx.globalAlpha = 1;

      // линия имени
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, u * 0.004);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.28, y + h * 0.55);
      ctx.lineTo(cx + w * 0.28, y + h * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // строки текста
      ctx.fillStyle = ink;
      [0.61, 0.66, 0.71].forEach((f, i) => {
        ctx.globalAlpha = 0.22;
        const ww = i < 2 ? 0.48 : 0.3;
        ctx.fillRect(cx - w * ww / 2, y + h * f, w * ww, Math.max(1, h * 0.01));
      });
      ctx.globalAlpha = 1;

      // печать (пунктир-кольцо) + линия подписи
      ctx.strokeStyle = ink;
      ctx.setLineDash([u * 0.02, u * 0.015]);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, u * 0.005);
      ctx.beginPath();
      ctx.arc(x + w - p * 2.4, y + h - p * 2.4, u * 0.07, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x + p * 2, y + h - p * 2);
      ctx.lineTo(x + p * 2 + w * 0.28, y + h - p * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    accentMarks(r) {
      const { x, y, w, h } = r;
      const u = Math.min(w, h);
      if (medallion) {
        const er = u * 0.08;
        return [{ kind: "text", text: "PM", x: x + w / 2, y: y + h * 0.2 - er * 0.55, size: Math.round(er * 1.1), align: "center" }];
      }
      // без медальона акцент/фольга — на заголовке, тем же кеглем, что в content
      return [{ kind: "text", text: o.title, x: x + w / 2, y: y + h * 0.3, size: awardTitleSize(o.title, u, w), align: "center", font: AWARD_SERIF }];
    },
  };
}

// Грамота — исторический ключ `award`; остальные три различаются словом и деталью.
const award = makeAward({ title: "ГРАМОТА", intro: "награждается" });
const certificate = makeAward({ title: "СЕРТИФИКАТ", intro: "настоящим удостоверяется", subline: "№ 00123" });
const diploma = makeAward({ title: "ДИПЛОМ", intro: "награждается", subline: "I МЕСТО" });
const gratitude = makeAward({ title: "БЛАГОДАРНОСТЬ", intro: "объявляется", medallion: false });

// Макет «бейдж» (badges): прорезь под ленту, фото-плейсхолдер, имя, должность,
// компания. Кластеры (медицинский/магнит/металлик/лента/пластик) — материал/форма.
const badge: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;

    // прорезь под ленту — горизонтальный паз у верхнего края
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.max(1, u * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.13, y + h * 0.07);
    ctx.lineTo(cx + w * 0.13, y + h * 0.07);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // фото-плейсхолдер
    const ph = u * 0.34;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.14;
    roundRect(ctx, cx - ph / 2, y + h * 0.14, ph, ph, ph * 0.1);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.14 + ph * 0.4, ph * 0.16, 0, Math.PI * 2); // голова
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.14 + ph * 0.95, ph * 0.3, Math.PI, 0); // плечи
    ctx.fill();
    ctx.globalAlpha = 1;

    // имя, должность, компания
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `700 ${Math.round(u * 0.11)}px system-ui, sans-serif`;
    ctx.fillText("Иван Петров", cx, y + h * 0.56);
    ctx.globalAlpha = 0.6;
    ctx.font = `400 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
    ctx.fillText("Менеджер", cx, y + h * 0.68);
    ctx.globalAlpha = 1;
    // акцентная плашка-подвал с брендом
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + w * 0.15, y + h * 0.82, w * 0.7, h * 0.06);
    ctx.globalAlpha = 1;
  },
  // фольгируется акцентная плашка-подвал (её же рисует ink — металл её накрывает)
  accentMarks(r) {
    const { x, y, w, h } = r;
    return [{ kind: "rect", x: x + w * 0.15, y: y + h * 0.82, w: w * 0.7, h: h * 0.06 }];
  },
};

// Макет «чертёж» (blueprints): технические проекции с размерными линиями и
// угловой штамп (title block). Кластеры — А3/проектная/фальцовка/копирование.
const blueprint: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, u * 0.005);

    // деталь: прямоугольник + окружность + осевые
    ctx.globalAlpha = 0.4;
    const dx = x + w * 0.14, dy = y + h * 0.2, dw = w * 0.4, dh = h * 0.42;
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.beginPath();
    ctx.arc(dx + dw * 0.5, dy + dh * 0.5, Math.min(dw, dh) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    // осевые (штрихпунктир)
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([u * 0.03, u * 0.01, u * 0.008, u * 0.01]);
    ctx.beginPath();
    ctx.moveTo(dx - w * 0.03, dy + dh * 0.5); ctx.lineTo(dx + dw + w * 0.03, dy + dh * 0.5);
    ctx.moveTo(dx + dw * 0.5, dy - h * 0.03); ctx.lineTo(dx + dw * 0.5, dy + dh + h * 0.03);
    ctx.stroke();
    ctx.setLineDash([]);

    // размерная линия со стрелками снизу
    ctx.globalAlpha = 0.35;
    const my = dy + dh + h * 0.08;
    ctx.beginPath(); ctx.moveTo(dx, my); ctx.lineTo(dx + dw, my); ctx.stroke();
    const ar = u * 0.02;
    [[dx, 1], [dx + dw, -1]].forEach(([ax, s]) => {
      ctx.beginPath(); ctx.moveTo(ax, my); ctx.lineTo(ax + s * ar, my - ar * 0.6); ctx.lineTo(ax + s * ar, my + ar * 0.6); ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
    });
    ctx.globalAlpha = 1;

    // угловой штамп (title block) справа снизу
    const bw = w * 0.32, bh = h * 0.16, bx = x + w - w * 0.06 - bw, by = y + h - h * 0.06 - bh;
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.beginPath();
    ctx.moveTo(bx, by + bh * 0.5); ctx.lineTo(bx + bw, by + bh * 0.5);
    ctx.moveTo(bx + bw * 0.6, by); ctx.lineTo(bx + bw * 0.6, by + bh);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ink;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(u * 0.04)}px Georgia, serif`;
    ctx.fillText("PM", bx + bw * 0.66, by + bh * 0.28);
    ctx.globalAlpha = 1;
  },
};

// Макет «план эвакуации» (evacuation-plans): стены помещения, путь-стрелки к
// выходу с зелёной (тёмной) меткой EXIT. Кластер — печать по макету.
const plan: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.1;
    const gx = x + p, gy = y + p, gw = w - 2 * p, gh = h - 2 * p;

    // наружные стены
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(2, u * 0.014);
    ctx.strokeRect(gx, gy, gw, gh);
    // внутренние перегородки
    ctx.lineWidth = Math.max(1, u * 0.008);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(gx + gw * 0.4, gy); ctx.lineTo(gx + gw * 0.4, gy + gh * 0.55);
    ctx.moveTo(gx + gw * 0.7, gy + gh); ctx.lineTo(gx + gw * 0.7, gy + gh * 0.45);
    ctx.moveTo(gx, gy + gh * 0.6); ctx.lineTo(gx + gw * 0.4, gy + gh * 0.6);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // путь-стрелки (зелёный маршрут → тёмным ink)
    const path = [
      [gx + gw * 0.2, gy + gh * 0.8],
      [gx + gw * 0.55, gy + gh * 0.8],
      [gx + gw * 0.55, gy + gh * 0.5],
      [gx + gw * 0.88, gy + gh * 0.5],
    ];
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(2, u * 0.012);
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
    ctx.stroke();
    // наконечник у выхода
    const [ex, ey] = path[path.length - 1];
    const a = u * 0.03;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(ex, ey); ctx.lineTo(ex - a, ey - a * 0.7); ctx.lineTo(ex - a, ey + a * 0.7); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // метка EXIT (тёмный прямоугольник у стены)
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(gx + gw - u * 0.02, gy + gh * 0.42, u * 0.05, gh * 0.16);
    ctx.globalAlpha = 1;
  },
};

// Макет «приглашение» (invites): изящная рамка с уголками, монограмма, «Приглашаем»,
// строки и дата. Кластеры — свадебные / день рождения (тематику даёт материал/цвет).
const invite: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;
    const p = u * 0.1;

    // тонкая рамка + уголки-засечки
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.strokeRect(x + p, y + p, w - 2 * p, h - 2 * p);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, u * 0.006);
    const c = u * 0.05;
    [[x + p, y + p, 1, 1], [x + w - p, y + p, -1, 1], [x + p, y + h - p, 1, -1], [x + w - p, y + h - p, -1, -1]].forEach(([px, py, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(px + sx * c, py); ctx.lineTo(px, py); ctx.lineTo(px, py + sy * c);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // монограмма
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(u * 0.16)}px Georgia, serif`;
      ctx.fillText("PM", cx, y + h * 0.2);
    }
    // «Приглашаем» + строки
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.font = `italic 400 ${Math.round(u * 0.07)}px Georgia, serif`;
    ctx.fillText("Приглашаем", cx, y + h * 0.42);
    ctx.globalAlpha = 0.25;
    [0.56, 0.62].forEach((f) => ctx.fillRect(cx - w * 0.22, y + h * f, w * 0.44, Math.max(1, h * 0.01)));
    ctx.globalAlpha = 1;
    // дата в рамочке снизу
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.max(1, u * 0.004);
    const dw = w * 0.3, dh = h * 0.06;
    ctx.strokeRect(cx - dw / 2, y + h * 0.76, dw, dh);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ink;
    ctx.font = `500 ${Math.round(u * 0.045)}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText("00.00.0000", cx, y + h * 0.76 + dh * 0.55);
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    return [{ kind: "text", text: "PM", x: x + w / 2, y: y + h * 0.2, size: Math.round(Math.min(w, h) * 0.16), align: "center" }];
  },
};

// Штрихкод: штрихи фиксированного шаблона (НЕ Math.random — иначе узор дрожит
// на каждой перерисовке и в снимке для корзины). Ширины разной толщины, иначе
// читается как гребёнка, а не как код.
const BARS = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1];
function barcode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, ink: string,
) {
  const total = BARS.reduce((a, b) => a + b, 0) + BARS.length; // +пробел на штрих
  const unit = w / total;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.75;
  let bx = x;
  for (const b of BARS) {
    ctx.fillRect(bx, y, Math.max(0.7, unit * b), h);
    bx += unit * (b + 1);
  }
  ctx.restore();
}

// Макет «этикетка» (labels): рамка-этикетка, бренд сверху, эмблема, название,
// штрихкод + объём. Кластеры — вино/пиво/косметика/кофе/продукты/на бутылку
// (форму и материал даёт движок). Штрихкод здесь не только ради кластера
// /labels/barcode: на настоящей этикетке он есть почти всегда, и с ним кукла
// перестаёт быть чисто винной.
const label: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;
    const p = u * 0.1;

    // Внутренняя рамка этикетки. У круглой прямоугольную рамку срезает контуром
    // изделия — оставались висящие обрубки сверху и снизу, поэтому там кольцо.
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, u * 0.006);
    if (env.round) {
      ctx.beginPath();
      ctx.arc(cx, y + h / 2, u / 2 - p * 0.8, 0, Math.PI * 2);
    } else {
      roundRect(ctx, x + p, y + p, w - 2 * p, h - 2 * p, u * 0.04);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // бренд сверху
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `600 ${Math.round(u * 0.075)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", cx, y + h * 0.16);
    ctx.globalAlpha = 1;

    // эмблема-медальон (кольцо + PM)
    const ey = y + h * 0.4, er = u * 0.11;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.max(1, u * 0.007);
    ctx.beginPath();
    ctx.arc(cx, ey, er, 0, Math.PI * 2);
    ctx.stroke();
    if (!env.foilOn) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(er)}px Georgia, serif`;
      ctx.fillText("PM", cx, ey + er * 0.05);
    }
    ctx.globalAlpha = 1;

    // название
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(cx - w * 0.2, y + h * 0.6, w * 0.4, Math.max(1, h * 0.02));
    ctx.globalAlpha = 0.25;
    ctx.fillRect(cx - w * 0.13, y + h * 0.66, w * 0.26, Math.max(1, h * 0.012));
    ctx.globalAlpha = 1;

    // Низ этикетки: штрихкод + объём. У круглой они не влезают в строку (угол
    // среза съедает края), поэтому там — колонкой по центру.
    ctx.textBaseline = "middle";
    ctx.fillStyle = ink;
    ctx.font = `500 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
    if (env.round) {
      barcode(ctx, cx - w * 0.15, y + h * 0.71, w * 0.3, h * 0.07, ink);
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.55;
      ctx.fillText("0,75 л", cx, y + h * 0.85);
    } else {
      const bandY = y + h * 0.77;
      barcode(ctx, x + p + u * 0.05, bandY, w * 0.26, h * 0.1, ink);
      ctx.textAlign = "right";
      ctx.globalAlpha = 0.55;
      ctx.fillText("0,75 л", x + w - p - u * 0.05, bandY + h * 0.05);
    }
    ctx.globalAlpha = 1;
  },
  accentMarks(r) {
    const { x, y, w, h } = r;
    const er = Math.min(w, h) * 0.11;
    return [{ kind: "text", text: "PM", x: x + w / 2, y: y + h * 0.4 - er * 0.55, size: Math.round(er), align: "center" }];
  },
};

// Макет «карта» (maps-atlases): сетка, дороги, метка-пин, компас. Кластеров нет —
// образ общий «картографический лист».
const map: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);

    // сетка
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    const step = u * 0.16;
    for (let gx = x + step; gx < x + w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
    for (let gy = y + step; gy < y + h; gy += step) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // дороги
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(2, u * 0.02);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.7); ctx.lineTo(x + w * 0.5, y + h * 0.5); ctx.lineTo(x + w * 0.95, y + h * 0.62);
    ctx.moveTo(x + w * 0.35, y + h * 0.05); ctx.lineTo(x + w * 0.45, y + h * 0.95);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // метка-пин
    const px = x + w * 0.62, py = y + h * 0.42, pr = u * 0.07;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(px, py, pr, Math.PI, 0);
    ctx.lineTo(px, py + pr * 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // компас (кольцо + стрелка N) в углу
    const cxp = x + w - u * 0.14, cyp = y + u * 0.14, cr = u * 0.08;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, u * 0.005);
    ctx.beginPath();
    ctx.arc(cxp, cyp, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cxp, cyp - cr * 0.75); ctx.lineTo(cxp - cr * 0.3, cyp); ctx.lineTo(cxp + cr * 0.3, cyp); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};

// Макет «меню» (menus): шапка «МЕНЮ», секции с позициями «блюдо … цена».
// Кластер — в папке (форму даёт материал/постпечать).
const menu: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const m = w * 0.12;
    const cx = x + w / 2;

    // шапка
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `700 ${Math.round(w * 0.09)}px Georgia, serif`;
    if (!env.foilOn) ctx.fillText("МЕНЮ", cx, y + h * 0.07);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.beginPath();
    ctx.moveTo(x + m, y + h * 0.16); ctx.lineTo(x + w - m, y + h * 0.16); ctx.stroke();
    ctx.globalAlpha = 1;

    // 2 секции по 3 позиции
    let ry = y + h * 0.22;
    const rowH = h * 0.075;
    for (let s = 0; s < 2; s++) {
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + m, ry, w * 0.28, Math.max(1, h * 0.018)); // заголовок секции
      ctx.globalAlpha = 1;
      ry += rowH * 0.9;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x + m, ry, w * (0.3 + (i % 2) * 0.1), Math.max(1, h * 0.012)); // блюдо
        // пунктир-лидер
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = ink;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x + m + w * 0.5, ry + h * 0.008); ctx.lineTo(x + w - m - w * 0.12, ry + h * 0.008);
        ctx.stroke();
        ctx.setLineDash([]);
        // цена
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x + w - m - w * 0.1, ry, w * 0.1, Math.max(1, h * 0.012));
        ctx.globalAlpha = 1;
        ry += rowH;
      }
      ry += rowH * 0.4;
    }
  },
  // фольгируется шапка «МЕНЮ»
  accentMarks(r) {
    const { x, y, w, h } = r;
    return [{ kind: "text", text: "МЕНЮ", x: x + w / 2, y: y + h * 0.07, size: Math.round(w * 0.09), align: "center" }];
  },
};

// Макет «открытка» (postcards): крупное поле изображения + поздравление и строки.
// Кластеры — фото/логотип/новогодние (сюжет даёт печать поверх, тут — форма).
const postcard: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.07;

    // поле изображения (верх ~58%)
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x + p, y + p, w - 2 * p, h * 0.52);
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, u * 0.008);
    ctx.beginPath();
    ctx.moveTo(x + p, y + p); ctx.lineTo(x + w - p, y + p + h * 0.52);
    ctx.moveTo(x + w - p, y + p); ctx.lineTo(x + p, y + p + h * 0.52);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // поздравление (рукописный акцент)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `italic 700 ${Math.round(u * 0.12)}px Georgia, serif`;
    if (!env.foilOn) ctx.fillText("С праздником!", x + w / 2, y + h * 0.66);
    ctx.globalAlpha = 0.25;
    [0.84, 0.9].forEach((f) => ctx.fillRect(x + w / 2 - w * 0.25, y + h * f, w * 0.5, Math.max(1, h * 0.02)));
    ctx.globalAlpha = 1;
  },
  // фольгируется поздравление — на открытках золотят именно его
  accentMarks(r) {
    const { x, y, w, h } = r;
    const size = Math.round(Math.min(w, h) * 0.12);
    return [{ kind: "text", text: "С праздником!", x: x + w / 2, y: y + h * 0.66 - size * 0.5, size, align: "center" }];
  },
};

// Макет «билет» (tickets): линия перфорации отделяет корешок с номером; слева
// «ВХОД», событие и дата. Кластеры — лотерейные / нумерация-перфорация.
const ticket: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;

    // ПОРТРЕТ (напр. Евро 99×210): перфорация горизонтально снизу, корешок с
    // номером — в отрывной части. Шрифты от ширины (=меньшая сторона).
    if (h > w * 1.15) {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = ink;
      ctx.font = `800 ${Math.round(w * 0.17)}px system-ui, sans-serif`;
      if (!env.foilOn) ctx.fillText("ВХОД", cx, y + h * 0.08);
      // событие + дата
      ctx.globalAlpha = 0.4;
      ctx.fillRect(cx - w * 0.3, y + h * 0.24, w * 0.6, Math.max(1, w * 0.035));
      ctx.globalAlpha = 0.25;
      ctx.fillRect(cx - w * 0.2, y + h * 0.31, w * 0.4, Math.max(1, w * 0.028));
      ctx.globalAlpha = 1;
      // перфорация горизонтально
      const perfY = y + h * 0.64;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1, w * 0.02);
      ctx.setLineDash([w * 0.06, w * 0.045]);
      ctx.beginPath();
      ctx.moveTo(x, perfY); ctx.lineTo(x + w, perfY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // отрывной корешок: «№» + номер
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.5;
      ctx.font = `500 ${Math.round(w * 0.1)}px system-ui, sans-serif`;
      ctx.fillText("№", cx, y + h * 0.71);
      ctx.globalAlpha = 0.85;
      ctx.font = `800 ${Math.round(w * 0.2)}px system-ui, sans-serif`;
      ctx.fillText("0042", cx, y + h * 0.79);
      ctx.globalAlpha = 1;
      return;
    }

    // ЛАНДШАФТ: перфорация вертикально, корешок справа. Шрифты от высоты (=меньшая).
    const px = x + w * 0.72;
    const m = u * 0.16;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, u * 0.01);
    ctx.setLineDash([u * 0.04, u * 0.03]);
    ctx.beginPath();
    ctx.moveTo(px, y); ctx.lineTo(px, y + h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `800 ${Math.round(u * 0.2)}px system-ui, sans-serif`;
    if (!env.foilOn) ctx.fillText("ВХОД", x + m, y + m);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + m, y + h * 0.5, w * 0.4, Math.max(1, h * 0.05));
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x + m, y + h * 0.66, w * 0.28, Math.max(1, h * 0.04));
    ctx.globalAlpha = 1;

    const sx = px + (x + w - px) / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${Math.round(u * 0.1)}px system-ui, sans-serif`;
    ctx.fillText("№", sx, y + h * 0.28);
    ctx.globalAlpha = 0.8;
    ctx.font = `800 ${Math.round(u * 0.2)}px system-ui, sans-serif`;
    ctx.fillText("0042", sx, y + h * 0.44);
    ctx.globalAlpha = 1;
  },
  // Фольгируется «ВХОД». Раскладка билета ветвится по ориентации (инвариант 3),
  // метка обязана ветвиться вместе с ней — иначе на портрете металл уедет.
  accentMarks(r) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    if (h >= w) {
      const size = Math.round(w * 0.17);
      return [{ kind: "text", text: "ВХОД", x: x + w / 2, y: y + h * 0.08, size, align: "center", font: SANS }];
    }
    return [{ kind: "text", text: "ВХОД", x: x + u * 0.16, y: y + u * 0.16, size: Math.round(u * 0.2), font: SANS }];
  },
};

// Макет «трафарет» (stencils): пластина с прорезанными глифами (контур с мостиками)
// и метки реза. Кластеров нет — общий образ.
const stencil: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.1;

    // пластина
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.06;
    roundRect(ctx, x + p * 0.5, y + p * 0.5, w - p, h - p, u * 0.03);
    ctx.fill();
    ctx.globalAlpha = 1;

    // «прорезанные» глифы — контур
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(2, u * 0.012);
    ctx.font = `800 ${Math.round(h * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("АБ12", x + w / 2, y + h * 0.5);
    ctx.globalAlpha = 1;

    // метки реза по углам
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    const c = u * 0.05;
    [[x + p, y + p], [x + w - p, y + p], [x + p, y + h - p], [x + w - p, y + h - p]].forEach(([mx, my]) => {
      ctx.beginPath();
      ctx.moveTo(mx - c, my); ctx.lineTo(mx + c, my);
      ctx.moveTo(mx, my - c); ctx.lineTo(mx, my + c);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  },
};

// Подобрать кегль так, чтобы строка ВЛЕЗЛА в ширину. Инвариант «метрики от
// меньшей стороны» задаёт стартовый размер, но одного его мало: на узком
// портрете (Ценник A7 74×105 — дефолт продукта) «990 ₽» обрезало ровно на
// символе рубля. Считать ширину, а не надеяться на пропорцию.
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string, maxW: number, startPx: number,
  weight: string, family: string,
): number {
  let size = startPx;
  for (let i = 0; i < 24 && size > 4; i++) {
    ctx.font = `${weight} ${Math.round(size)}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    size *= 0.92;
  }
  ctx.font = `${weight} ${Math.round(size)}px ${family}`;
  return Math.round(size);
}

const SANS = "system-ui, sans-serif";

// У POS-материалов метка размера называет ИЗДЕЛИЕ, а не только габарит, и все
// три изделия сидят на одном продукте. Ведём силуэт от неё, а не от кластера:
// плитки размера («Ценник A7», «Воблер 80×80», «Хенгер дверной 95×280») стоят
// прямо в калькуляторе, и переключение плитки обязано менять картинку —
// переопределение сцены кластером закрыло бы только вход на посадочную.
type PosKind = "pricetag" | "wobbler" | "hanger";
const posKindOf = (label?: string): PosKind =>
  /вобл/i.test(label ?? "") ? "wobbler"
    : /хенгер/i.test(label ?? "") ? "hanger"
      : "pricetag";

// Ценник: название, старая цена зачёркнута, крупная цена, ярлык «АКЦИЯ».
// Раскладка ведётся ОТ НИЗА — так цена остаётся крупной и на портрете, и на
// ландшафте, а не уезжает за край на одном из них.
function drawPricetag(ctx: CanvasRenderingContext2D, r: Rect, ink: string, round: boolean) {
  const { x, y, w, h } = r;
  const u = Math.min(w, h);
  const m = u * (round ? 0.2 : 0.12);
  const innerW = w - 2 * m;

  // ярлык «АКЦИЯ» — от меньшей стороны, иначе на хенгере 95×280 он вытягивался
  // в вертикальную пилюлю во всю высоту
  const tw = Math.min(innerW * 0.34, u * 0.4);
  const tH = Math.min(h * 0.16, u * 0.18);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, x + w - m - tw, y + m, tw, tH, tH * 0.25);
  ctx.fill();
  ctx.globalAlpha = 1;

  // название сверху слева — ровно до ярлыка
  ctx.globalAlpha = 0.45;
  ctx.fillRect(x + m, y + m, Math.max(0, innerW - tw - u * 0.08), Math.max(1, u * 0.05));
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  // Кегль ограничен И шириной, И остатком высоты под шапкой: на ландшафтном
  // ценнике 60×40 стопка «старая цена + крупная цена» иначе наезжает на шапку —
  // по ширине-то она влезает, а по высоте нет.
  const stackH = Math.max(u * 0.2, h - 2 * m - tH * 0.6);
  const price = "990 ₽";
  const pSize = fitFont(ctx, price, innerW, Math.min(u * 0.42, stackH * 0.6), "800", SANS);
  const priceBase = y + h - m;
  ctx.fillStyle = ink;
  ctx.fillText(price, x + m, priceBase);

  // старая цена — над крупной, зачёркнута
  const old = "1 200 ₽";
  ctx.globalAlpha = 0.4;
  const oSize = fitFont(ctx, old, innerW * 0.7, Math.min(u * 0.16, stackH * 0.24), "500", SANS);
  const oldBase = priceBase - pSize * 1.05;
  ctx.fillText(old, x + m, oldBase);
  const ow = ctx.measureText(old).width;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, u * 0.012);
  ctx.beginPath();
  ctx.moveTo(x + m, oldBase - oSize * 0.32);
  ctx.lineTo(x + m + ow, oldBase - oSize * 0.32);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Воблер: плашка-вспышка на полке. Ножка физически КЛЕИТСЯ сзади и в габарит
// изделия не входит, поэтому наружу её не вывести (сцена живёт внутри контура) —
// обозначаем пятаком крепления и полоской, уходящей за нижний край: клип делает
// вид, будто она продолжается за плашкой.
function drawWobbler(ctx: CanvasRenderingContext2D, r: Rect, ink: string) {
  const { x, y, w, h } = r;
  const u = Math.min(w, h);
  const cx = x + w / 2, cy = y + h * 0.44;

  // вспышка-звезда под текстом
  const R = u * 0.44, rays = 16;
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / rays;
    const rad = i % 2 ? R * 0.78 : R;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = ink;

  ctx.textBaseline = "bottom";
  ctx.globalAlpha = 0.75;
  fitFont(ctx, "АКЦИЯ", R * 1.3, u * 0.13, "700", SANS);
  ctx.fillText("АКЦИЯ", cx, cy - u * 0.06);

  ctx.textBaseline = "top";
  ctx.globalAlpha = 1;
  fitFont(ctx, "-30%", R * 1.5, u * 0.34, "800", SANS);
  ctx.fillText("-30%", cx, cy - u * 0.03);
  ctx.globalAlpha = 1;

  // Ножка: прозрачная пластиковая полоса, уходящая за нижний край (клип делает
  // вид, что она продолжается за плашкой). БЕЗ обведённого кружка — с ним она
  // читалась как вырез и зеркалила отверстие хенгера, то есть два разных
  // изделия выглядели похоже. Полоса со скруглённым верхом на это не похожа.
  ctx.save();
  ctx.fillStyle = ink;
  const fw = u * 0.11, ftop = y + h * 0.8;
  ctx.globalAlpha = 0.16;
  roundRect(ctx, cx - fw / 2, ftop, fw, y + h - ftop + 1, fw * 0.45);
  ctx.fill();
  // точка приклейки
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(cx, ftop + fw * 0.5, fw * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Хенгер (дорхенгер): подвес на дверную ручку. Опознаётся вырезом — круглое
// отверстие с прорезью к верхнему краю. Вырубка тут и есть изделие (прецедент
// volume-sticker), поэтому рисует её сцена, а не движок.
function drawHanger(ctx: CanvasRenderingContext2D, r: Rect, ink: string) {
  const { x, y, w, h } = r;
  const u = Math.min(w, h);
  const cx = x + w / 2;
  const hole = u * 0.17;
  const holeY = y + h * 0.055 + hole * 1.5;

  // отверстие + прорезь: светлая заливка «сквозь» и тёмный кант реза
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, holeY, hole, 0, Math.PI * 2);
  ctx.rect(cx - hole * 0.42, y - 1, hole * 0.84, holeY - y + 1);
  ctx.fillStyle = "rgba(120,126,134,0.28)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.lineWidth = Math.max(1, u * 0.008);
  ctx.beginPath();
  ctx.arc(cx, holeY, hole, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - hole * 0.42, y);
  ctx.lineTo(cx - hole * 0.42, holeY);
  ctx.moveTo(cx + hole * 0.42, y);
  ctx.lineTo(cx + hole * 0.42, holeY);
  ctx.stroke();
  ctx.restore();

  // контент ниже выреза: заголовок, строки, плашка-призыв
  const top = holeY + hole * 1.6;
  const m = u * 0.16;
  const innerW = w - 2 * m;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.globalAlpha = 0.85;
  fitFont(ctx, "АКЦИЯ", innerW, u * 0.2, "800", SANS);
  ctx.fillText("АКЦИЯ", cx, top);

  ctx.globalAlpha = 0.3;
  const lh = Math.max(2, u * 0.09);
  for (let i = 0; i < 3; i++) {
    const lw = innerW * (i === 2 ? 0.55 : 0.85);
    ctx.fillRect(cx - lw / 2, top + u * 0.3 + i * lh, lw, Math.max(1, u * 0.035));
  }
  ctx.globalAlpha = 0.8;
  const bw = innerW * 0.8, bh = u * 0.16;
  roundRect(ctx, cx - bw / 2, y + h - m - bh, bw, bh, bh * 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Макет «POS-материалы» (ключ реестра остался `pricetag` — им помечен продукт).
// Три изделия одного продукта, силуэт выбирается меткой размера.
const pricetag: Mockup = {
  content(ctx, r, env) {
    ctx.save();
    switch (posKindOf(env.sizeLabel)) {
      case "wobbler": drawWobbler(ctx, r, env.ink); break;
      case "hanger": drawHanger(ctx, r, env.ink); break;
      default: drawPricetag(ctx, r, env.ink, env.round);
    }
    ctx.restore();
  },
  // Фольгируется акцент, и он у каждого изделия свой: у ценника — ярлык-плашка,
  // у воблера и хенгера — слово «АКЦИЯ». Метки ветвятся тем же posKindOf, что и
  // раскладка, иначе металл ляжет мимо силуэта.
  accentMarks(r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    switch (posKindOf(env.sizeLabel)) {
      case "wobbler": {
        const size = Math.round(u * 0.13);
        return [{
          kind: "text", text: "АКЦИЯ", x: x + w / 2,
          y: y + h * 0.44 - u * 0.06 - size, size, align: "center", font: SANS,
        }];
      }
      case "hanger": {
        const hole = u * 0.17;
        return [{
          kind: "text", text: "АКЦИЯ", x: x + w / 2,
          y: y + h * 0.055 + hole * 1.5 + hole * 1.6,
          size: Math.round(u * 0.2), align: "center", font: SANS,
        }];
      }
      default: {
        const m = u * (env.round ? 0.2 : 0.12);
        const tw = Math.min((w - 2 * m) * 0.34, u * 0.4);
        const tH = Math.min(h * 0.16, u * 0.18);
        return [{ kind: "rect", x: x + w - m - tw, y: y + m, w: tw, h: tH, radius: tH * 0.25 }];
      }
    }
  },
};

export const mockups: Record<string, Mockup> = {
  card, sticker, leaflet, letterhead, envelope, poster, tag, sign, folder, forms,
  "business-card": businessCard, award, certificate, diploma, gratitude,
  badge, blueprint, plan, invite, label,
  map, menu, postcard, ticket, stencil, pricetag,
  "volume-sticker": volumeSticker,
  // сцены КЛАСТЕРОВ наклеек (назначаются через preset.previewKind, не полем продукта)
  "sticker-pack": stickerPack,
  "sticker-qr": stickerQr,
};

// `fallback` — сцена ПРОДУКТА, когда кластер переопределил её пресетом. Без неё
// опечатка или ещё не выкаченная сцена роняли кластер на визитку (`card`) —
// то есть наклейка показывалась визиткой. Теперь худший случай — сцена продукта,
// то есть ровно то, что было до переопределения.
export function getMockup(kind?: string | null, fallback?: string | null): Mockup {
  return (kind && mockups[kind]) || (fallback && mockups[fallback]) || card;
}
