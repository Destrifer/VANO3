// Реестр макетов превью по продуктам. Каждый макет рисует ТОЛЬКО содержимое
// («рыбу»), а универсальные слои (контур, материя, глянец) даёт Preview.vue.
// Новый продукт со своей сценой = +1 запись здесь, движок не трогаем.
import type { Rect } from "./primitives";
import { drawFoilText, roundRect } from "./primitives";

export type MockupEnv = {
  round: boolean;
  ink: string; // цвет краски печати (контраст к бумаге)
  foilOn: boolean;
  foilHex: string;
  foldCount: number; // число сгибов (буклеты) → панелей = foldCount + 1
};

export type Mockup = {
  // ink-слой (до глянца ламинации)
  content: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
  // foil-слой (после глянца, металл поверх) — опционально
  foil?: (ctx: CanvasRenderingContext2D, r: Rect, env: MockupEnv) => void;
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const round = env.round;
    const p = pad(r, round);
    const fs = round ? 0.85 : 1;
    const size = Math.round(h * 0.18 * fs);
    const lx = round ? x + w / 2 : x + p;
    drawFoilText(ctx, "PM", lx, y + p, size, round ? "center" : "left", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const m = Math.min(w, h);
    const size = Math.round(m * 0.34);
    drawFoilText(ctx, "PM", x + w / 2, y + h / 2 - h * 0.04 - size / 2, size, "center", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, w } = r;
    drawFoilText(ctx, "PM", x + w * 0.1, y + w * 0.1, Math.round(w * 0.11), "left", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    drawFoilText(ctx, "PM", x + u * 0.09, y + h * 0.17, Math.round(u * 0.2), "left", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, h } = r;
    const u = Math.min(r.w, h);
    drawFoilText(ctx, "PRINTMOS", x + u * 0.08, y + h * 0.6, Math.round(u * 0.16), "left", env.foilHex, "system-ui, sans-serif");
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    const size = Math.round(u * 0.24);
    drawFoilText(ctx, "PM", x + w / 2, y + h * 0.45 - size / 2, size, "center", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    drawFoilText(ctx, "101", x + w / 2, y + h * 0.56, Math.round(u * 0.14), "center", env.foilHex, "system-ui, sans-serif");
  },
};

// Макет «папка» (presentation folder): лого на обложке + диагональ кармана
// поперёк нижней трети и линия нижней кромки — читается как папка, не документ.
const folder: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const p = u * 0.1;

    // лого на обложке
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (!env.foilOn) {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(u * 0.16)}px Georgia, serif`;
      ctx.fillText("PM", x + p, y + p);
    }
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
    ctx.fillText("PRINTMOS", x + p, y + p + u * 0.19);
    ctx.globalAlpha = 1;

    // карман: диагональ от левого края к правому низу + кромка
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(1, u * 0.008);
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.62);
    ctx.lineTo(x + w, y + h * 0.78);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.62);
    ctx.lineTo(x + w, y + h * 0.78);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  foil(ctx, r, env) {
    const { x, y } = r;
    const u = Math.min(r.w, r.h);
    drawFoilText(ctx, "PM", x + u * 0.1, y + u * 0.1, Math.round(u * 0.16), "left", env.foilHex);
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
  foil(ctx, r, env) {
    const { x, y, w } = r;
    drawFoilText(ctx, "PM", x + w * 0.09, y + w * 0.09, Math.round(w * 0.1), "left", env.foilHex);
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
    const pd = u * (round ? 0.14 : 0.11);
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
    roundRect(ctx, x + pd * 0.55, y + pd * 0.55, w - pd * 1.1, h - pd * 1.1, u * 0.04);
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    if (env.round) {
      drawFoilText(ctx, "PM", x + w / 2, y + h * 0.2, Math.round(u * 0.2), "center", env.foilHex);
    } else {
      drawFoilText(ctx, "PM", x + u * 0.11, y + u * 0.11, Math.round(h * 0.2), "left", env.foilHex);
    }
  },
};

// Макет «наградной документ» (грамота/сертификат/диплом/благодарность): двойная
// рамка, эмблема-медальон сверху, заголовок, «награждается», линия имени, печать
// и подпись. Один образ на всю наградную группу — физически они идентичны.
const award: Mockup = {
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

    // эмблема-медальон сверху (кольцо + PM; при фольге — foil-слой)
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
      ctx.font = `700 ${Math.round(er * 1.1)}px Georgia, serif`;
      ctx.fillText("PM", cx, ey + er * 0.05);
    }

    // заголовок-плашка + «награждается»
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(cx - w * 0.24, y + h * 0.33, w * 0.48, h * 0.03);
    ctx.globalAlpha = 0.4;
    ctx.font = `400 ${Math.round(u * 0.05)}px system-ui, sans-serif`;
    ctx.fillText("награждается", cx, y + h * 0.41);
    ctx.globalAlpha = 1;

    // линия имени
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.28, y + h * 0.5);
    ctx.lineTo(cx + w * 0.28, y + h * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // строки текста
    ctx.fillStyle = ink;
    [0.56, 0.61, 0.66].forEach((f, i) => {
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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    const er = u * 0.08;
    drawFoilText(ctx, "PM", x + w / 2, y + h * 0.2 - er * 0.55, Math.round(er * 1.1), "center", env.foilHex);
  },
};

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
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    drawFoilText(ctx, "PM", x + w / 2, y + h * 0.2, Math.round(u * 0.16), "center", env.foilHex);
  },
};

// Макет «этикетка» (labels): рамка-этикетка, бренд сверху, эмблема, название,
// объём. Кластеры — вино/пиво/косметика/на бутылку (форму/материал даёт движок).
const label: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const cx = x + w / 2;
    const p = u * 0.1;

    // внутренняя рамка этикетки
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, u * 0.006);
    roundRect(ctx, x + p, y + p, w - 2 * p, h - 2 * p, u * 0.04);
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
    ctx.fillRect(cx - w * 0.2, y + h * 0.62, w * 0.4, Math.max(1, h * 0.02));
    ctx.globalAlpha = 0.25;
    ctx.fillRect(cx - w * 0.13, y + h * 0.68, w * 0.26, Math.max(1, h * 0.012));
    ctx.globalAlpha = 1;

    // объём
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.font = `500 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
    ctx.fillText("0,75 л", cx, y + h * 0.8);
    ctx.globalAlpha = 1;
  },
  foil(ctx, r, env) {
    const { x, y, w, h } = r;
    const u = Math.min(w, h);
    const er = u * 0.11;
    drawFoilText(ctx, "PM", x + w / 2, y + h * 0.4 - er * 0.55, Math.round(er), "center", env.foilHex);
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
    ctx.fillText("МЕНЮ", cx, y + h * 0.07);
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
    ctx.fillText("С праздником!", x + w / 2, y + h * 0.66);
    ctx.globalAlpha = 0.25;
    [0.84, 0.9].forEach((f) => ctx.fillRect(x + w / 2 - w * 0.25, y + h * f, w * 0.5, Math.max(1, h * 0.02)));
    ctx.globalAlpha = 1;
  },
};

// Макет «билет» (tickets): линия перфорации отделяет корешок с номером; слева
// «ВХОД», событие и дата. Кластеры — лотерейные / нумерация-перфорация.
const ticket: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const px = x + w * 0.72; // линия перфорации
    const m = u * 0.16;

    // перфорация
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, u * 0.01);
    ctx.setLineDash([u * 0.04, u * 0.03]);
    ctx.beginPath();
    ctx.moveTo(px, y); ctx.lineTo(px, y + h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // левая зона: ВХОД + событие + дата
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `800 ${Math.round(h * 0.2)}px system-ui, sans-serif`;
    ctx.fillText("ВХОД", x + m, y + m);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + m, y + h * 0.5, w * 0.4, Math.max(1, h * 0.05)); // событие
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x + m, y + h * 0.66, w * 0.28, Math.max(1, h * 0.04)); // дата
    ctx.globalAlpha = 1;

    // корешок: «№» + номер
    const sx = px + (x + w - px) / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${Math.round(h * 0.1)}px system-ui, sans-serif`;
    ctx.fillText("№", sx, y + h * 0.28);
    ctx.globalAlpha = 0.8;
    ctx.font = `800 ${Math.round(h * 0.2)}px system-ui, sans-serif`;
    ctx.fillText("0042", sx, y + h * 0.44);
    ctx.globalAlpha = 1;
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

// Макет «ценник / POS» (pos-materials): крупная цена, старая цена зачёркнута,
// название, ярлык «АКЦИЯ». Кластеры — ценники / воблеры / хенгеры.
const pricetag: Mockup = {
  content(ctx, r, env) {
    const { x, y, w, h } = r;
    const ink = env.ink;
    const u = Math.min(w, h);
    const m = u * 0.12;

    // название сверху
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x + m, y + m, w * 0.5, Math.max(1, h * 0.06));
    ctx.globalAlpha = 1;

    // крупная цена
    ctx.fillStyle = ink;
    ctx.font = `800 ${Math.round(h * 0.34)}px system-ui, sans-serif`;
    ctx.fillText("990 ₽", x + m, y + h * 0.4);

    // старая цена зачёркнута
    ctx.globalAlpha = 0.4;
    ctx.font = `500 ${Math.round(h * 0.13)}px system-ui, sans-serif`;
    const oldT = "1 200 ₽";
    ctx.fillText(oldT, x + m, y + h * 0.24);
    const owM = ctx.measureText(oldT).width;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, u * 0.01);
    ctx.beginPath();
    ctx.moveTo(x + m, y + h * 0.305); ctx.lineTo(x + m + owM, y + h * 0.305); ctx.stroke();
    ctx.globalAlpha = 1;

    // ярлык «АКЦИЯ» справа
    const tw = w * 0.24, tH = h * 0.16, tx = x + w - m - tw, ty = y + m;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    roundRect(ctx, tx, ty, tw, tH, tH * 0.25);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};

export const mockups: Record<string, Mockup> = {
  card, sticker, leaflet, letterhead, envelope, poster, tag, sign, folder, forms,
  "business-card": businessCard, award, badge, blueprint, plan, invite, label,
  map, menu, postcard, ticket, stencil, pricetag,
};

export function getMockup(kind?: string | null): Mockup {
  return (kind && mockups[kind]) || card;
}
