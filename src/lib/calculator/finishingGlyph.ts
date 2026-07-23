// Глифы-фолбэки для плиток доп-обработки БЕЗ группы («Дополнительная
// обработка»: каширование, перфорация, пикалло, клеевая точка, скретч-слой,
// нумерация…). Подбор по имени — тот же приём, что у переплёта и фальцовки:
// список опций правится в админке, код при этом не трогаем.
//
// Показываются, пока владелец не загрузил фото в `finishing_options.image`;
// как только фото появится, OptionTile берёт картинку и глиф не рисуется.
// Тела SVG рассчитаны на viewBox "0 0 24 24".

const SHEET =
  '<rect x="4" y="3" width="16" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>';

export const EXTRA_GLYPH: Record<string, string> = {
  // каширование — склейка листа с картоном: два слоя со смещением
  kashir:
    '<rect x="3" y="7" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 7V4.5A1.5 1.5 0 0 1 8.5 3H19.5A1.5 1.5 0 0 1 21 4.5v11a1.5 1.5 0 0 1-1.5 1.5H17"/>',
  // перфорация — лист с линией отрыва
  perf:
    SHEET +
    '<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="1.5 3" d="M14 4v16"/>',
  // пикалло (микроперфорация) — лист с мелкой строчкой точек
  pikallo:
    SHEET +
    '<path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.5 2.5" d="M7 12h10"/>',
  // клеевая точка — лист с каплей
  glue:
    SHEET +
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 8.5c1.7 2.4 2.6 3.6 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.2.9-2.4 2.6-4.8z"/>',
  // скретч-слой — стираемое поле со «счищенным» уголком
  scratch:
    SHEET +
    '<rect x="7.5" y="9" width="9" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M8.5 14.2L12 10.5M11 14.5l3-3.4"/>',
  // нумерация — лист с номером
  number:
    SHEET +
    '<text x="12" y="15.5" text-anchor="middle" font-size="7" font-family="sans-serif" fill="currentColor">№</text>',
  // биговка — лист с линией сгиба (как в FoldField)
  crease:
    SHEET +
    '<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 4" d="M12 5v14"/>',
  // общий фолбэк для незнакомой опции (Tabler sparkles)
  other:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6"/>',
};

// Глифы-фолбэки для ГРУПП доп-обработки (плитки-варианты: скругление, сверление,
// еврослот, УФ-лак, конгрев, 3D-лак), пока владелец не загрузил фото вариантов.
// Общий модуль, чтобы листовой и многостраничный калькуляторы рисовали одинаково.
const GROUP_GLYPH: Record<string, string> = {
  "Скругление углов":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20v-6a10 10 0 0 1 10-10h6"/>',
  "Сверление отверстий":
    '<rect x="4" y="3" width="16" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  "Еврослот":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5a2.6 2.6 0 0 0-2.6 2.6c0 1.3.9 1.9.9 3.1V16a1.7 1.7 0 0 0 3.4 0v-5.3c0-1.2.9-1.8.9-3.1A2.6 2.6 0 0 0 12 5z"/>',
  "УФ-лак":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c3 4.2 5 6.6 5 9.2a5 5 0 0 1-10 0C7 9.6 9 7.2 12 3z"/>',
  "Конгрев":
    '<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  "Объёмный 3D-лак":
    '<circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.4" d="M9.5 12.2a3.2 3.2 0 0 1 2.5-1.4"/>',
};

/** Тело SVG для плитки ГРУППЫ доп-обработки по её заголовку. */
export function groupGlyph(heading: string): string | undefined {
  return GROUP_GLYPH[heading];
}

/** Тело SVG для плитки опции по её названию из Directus. */
export function extraGlyph(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("кашир")) return EXTRA_GLYPH.kashir;
  if (n.includes("пикалло") || n.includes("пиколло")) return EXTRA_GLYPH.pikallo;
  if (n.includes("перфор")) return EXTRA_GLYPH.perf;
  if (n.includes("клеев") || n.includes("клей")) return EXTRA_GLYPH.glue;
  if (n.includes("скретч") || n.includes("scratch")) return EXTRA_GLYPH.scratch;
  if (n.includes("нумер")) return EXTRA_GLYPH.number;
  if (n.includes("биговк")) return EXTRA_GLYPH.crease;
  return EXTRA_GLYPH.other;
}
