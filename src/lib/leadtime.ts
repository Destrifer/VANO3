// Срок готовности: из lead_days продукта + текущего времени → короткая фраза.
// Чистая функция, работает на клиенте (живой пересчёт без перезагрузки).
// Правила (согласовано):
//  - база: сегодня + lead_days рабочих дней (пропускаем сб/вс), минимум 1 → «завтра»;
//  - время: до cutoff → «до HH:00», после → «после HH:00» (запас для манёвра);
//  - подача дня по КАЛЕНДАРНОЙ Δ (решает выходные): 1→«завтра», 2..6→день недели,
//    >6 → классика «от N дней» (день недели на таком горизонте неоднозначен);
//  - без глаголов; на витрине = иконка + краткий текст.

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"]; // по Date.getDay()

function isWorkday(d: Date): boolean {
  const w = d.getDay();
  return w >= 1 && w <= 5;
}

function addWorkdays(from: Date, days: number): Date {
  const d = new Date(from);
  let n = 0;
  while (n < days) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) n++;
  }
  return d;
}

function dayDelta(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export type Lead = { text: string; title: string };

export function formatLead(now: Date, leadDays: number, cutoffHour: number): Lead {
  const lead = Math.max(1, Math.round(leadDays || 1));
  const ready = addWorkdays(now, lead);
  const delta = dayDelta(now, ready);
  const time = now.getHours() < cutoffHour ? `до ${cutoffHour}:00` : `после ${cutoffHour}:00`;
  if (delta > 6) {
    return { text: `от ${lead} дн.`, title: `Срок изготовления — от ${lead} рабочих дней` };
  }
  const day = delta <= 1 ? "завтра" : WD[ready.getDay()];
  return { text: `${day} ${time}`, title: `Готово ${day} ${time}` };
}

// Через сколько мс вывод изменится: ближайшая отсечка (сегодня) или полночь.
export function msToNextLeadBoundary(now: Date, cutoffHour: number): number {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cutoffHour, 0, 0, 0);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const target = now < cutoff ? cutoff : midnight;
  return Math.max(1000, target.getTime() - now.getTime() + 1000); // +1с буфер
}
