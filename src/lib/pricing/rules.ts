// Декларативные зависимости между полями калькулятора.
// Сейчас это типизированные данные + маленькие применители (не россыпь if).
// Позже массив правил переедет в Directus, а функции останутся теми же.

export type CoatingRule = {
  whenFoil: boolean;
  forceLaminationIncludes?: string; // подстрока названия ламинации, которую форсируем
  lockLamination?: boolean; // блокировать ли выбор ламинации
};

// Правило: включение фольги форсирует ламинацию Soft Touch и блокирует её выбор.
export const coatingRules: CoatingRule[] = [
  { whenFoil: true, forceLaminationIncludes: "Soft Touch", lockLamination: true },
];

// Заблокирован ли выбор ламинации при текущем состоянии фольги.
export function isLaminationLocked(
  foilOn: boolean,
  rules: CoatingRule[] = coatingRules,
): boolean {
  return foilOn && rules.some((r) => r.whenFoil && r.lockLamination);
}

// Индекс ламинации, который нужно форсировать (или -1, если нечего форсировать).
export function forcedLaminationIndex(
  foilOn: boolean,
  laminationNames: string[],
  rules: CoatingRule[] = coatingRules,
): number {
  if (!foilOn) return -1;
  for (const r of rules) {
    if (!r.whenFoil || !r.forceLaminationIncludes) continue;
    const inc = r.forceLaminationIncludes;
    const idx = laminationNames.findIndex((n) => n.includes(inc));
    if (idx >= 0) return idx;
  }
  return -1;
}
