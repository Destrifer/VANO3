// Глиф (иконка) формы/формата для плиток выбора размера и модель плитки.
// Глиф выбирается по геометрии (round / пропорция width:height), а не по
// «грязному» label — поэтому работает для любого пресета без таблицы соответствий.

export type Glyph =
  | "portrait" | "landscape" | "square" | "round" | "complex" | "custom";

// Плитка для SizePicker: id (для select по id, переживает гидрацию), глиф,
// имя сверху (A4/Евро/Свой) и опц. строка габаритов снизу (210×297).
export type SizeTile = { id: string; glyph: Glyph; label: string; sub?: string };

// Разбить label на «имя сверху» + «габариты снизу». Габариты всегда из width/
// height (чисто), имя = label без размерного куска. Чистые размеры (90×50) сами
// становятся именем, снизу — «мм». Круг → «⌀40» сверху, «мм» снизу.
export function splitLabel(
  label: string, w: number, h: number, shape: string,
): { top: string; sub: string } {
  if (shape === "round") return { top: `⌀${Math.round(w)}`, sub: "мм" };
  const name = label
    .replace(/\(?\s*\d+\s*[×x]\s*\d+\s*(?:мм)?\s*\)?/i, "") // убрать кусок W×H
    .replace(/^[\s(,—-]+|[\s),—-]+$/g, "")                   // обрезать пунктуацию по краям
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { top: `${Math.round(w)}×${Math.round(h)}`, sub: "мм" };
  return { top: name, sub: `${Math.round(w)}×${Math.round(h)}` };
}

// shape='round' → круг; иначе по соотношению сторон: почти равные → квадрат,
// иначе прямоугольник по ориентации (портрет/альбом). Вытянутые форматы (евро/DL)
// — это просто прямоугольник; формат различают подпись и габариты, не глиф.
export function glyphFor(shape: string, w: number, h: number): Glyph {
  if (shape === "round") return "round";
  if (shape === "complex") return "complex";
  const lo = Math.min(w, h), hi = Math.max(w, h);
  if (lo <= 0) return "portrait";
  if (hi / lo <= 1.08) return "square";
  return h >= w ? "portrait" : "landscape";
}
