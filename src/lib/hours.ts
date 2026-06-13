// Разбор строки часов работы вида «Пн–Пт 10:00–19:00» и расчёт статуса
// «открыто/закрыто» по московскому времени. Чистые функции — тестируемо,
// используются из клиентского скрипта на странице контактов.

export const DAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const DAY_INDEX: Record<string, number> = {
  вс: 0, пн: 1, вт: 2, ср: 3, чт: 4, пт: 5, сб: 6,
};

export type Schedule = {
  days: number[]; // индексы дней (0=Вс … 6=Сб), когда открыто
  openMin: number; // минуты от полуночи
  closeMin: number;
  openStr: string; // «10:00»
  closeStr: string; // «19:00»
};

export function parseHours(input: string | null | undefined): Schedule | null {
  if (!input) return null;
  const t = input.toLowerCase();

  const time = t.match(/(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/);
  if (!time) return null;
  const openMin = +time[1] * 60 + +time[2];
  const closeMin = +time[3] * 60 + +time[4];

  let days: number[] = [];
  const range = t.match(/(пн|вт|ср|чт|пт|сб|вс)\s*[–—-]\s*(пн|вт|ср|чт|пт|сб|вс)/);
  if (range) {
    const a = DAY_INDEX[range[1]];
    const b = DAY_INDEX[range[2]];
    for (let i = 0; i < 7; i++) {
      const d = (a + i) % 7;
      days.push(d);
      if (d === b) break;
    }
  } else {
    const singles = t.match(/пн|вт|ср|чт|пт|сб|вс/g);
    if (singles) days = singles.map((s) => DAY_INDEX[s]);
  }
  if (days.length === 0) days = [1, 2, 3, 4, 5];

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    days,
    openMin,
    closeMin,
    openStr: `${pad(+time[1])}:${pad(+time[2])}`,
    closeStr: `${pad(+time[3])}:${pad(+time[4])}`,
  };
}

export type Status = { open: boolean; label: string };

export function openStatus(sch: Schedule, day: number, minutes: number): Status {
  if (sch.days.includes(day) && minutes >= sch.openMin && minutes < sch.closeMin) {
    return { open: true, label: `Открыто · до ${sch.closeStr}` };
  }
  // ищем ближайшее открытие (сегодня до открытия → завтра → дальше)
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    if (!sch.days.includes(d)) continue;
    if (i === 0 && minutes < sch.openMin) {
      return { open: false, label: `Закрыто · откроется в ${sch.openStr}` };
    }
    if (i === 0) continue; // сегодня уже закрылись — смотрим дальше
    const when =
      i === 1
        ? `завтра в ${sch.openStr}`
        : `в ${DAY_SHORT[d].toLowerCase()}, ${sch.openStr}`;
    return { open: false, label: `Закрыто · откроется ${when}` };
  }
  return { open: false, label: "Закрыто" };
}

// Текущее московское время → { day: 0..6, minutes: 0..1439 } независимо от
// часового пояса посетителя (офис в Москве).
export function moscowNow(now: Date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const wmap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hour = +get("hour") % 24; // '24:00' → 0
  return { day: wmap[get("weekday")] ?? 1, minutes: hour * 60 + +get("minute") };
}
