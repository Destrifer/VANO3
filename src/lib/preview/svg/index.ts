// Единая точка входа для плиток: по конфигу продукта выбирает нужный stage.
// Нужна затем, чтобы каталог и главная строили плитку ОДНИМ вызовом и не могли
// разойтись — раньше выбор реестра лежал прямо в разметке каталога.
import type { ProductPricing } from "../../pricing/data";
import { productTileSvg } from "./tile";
import { coverTileSvg, defaultCoverTileInput } from "./coverTile";

// null — плитки нет (нет конфига или продукту не назначена сцена): вызывающий
// показывает иконку-фолбэк.
export function tileSvgForProduct(cfg: ProductPricing | null): string | null {
  if (!cfg) return null;
  // Многостраничные рисует stage книжки (covers.ts), листовые — плоский лист
  // (mockups.ts). Ключ preview_kind общий, просто резолвится в своём реестре.
  if (cfg.strategy === "multipage") return coverTileSvg(defaultCoverTileInput(cfg));
  if (!cfg.previewKind) return null;
  const size = cfg.sizes[0];
  return productTileSvg({
    previewKind: cfg.previewKind,
    mm: size ? { w: size.width, h: size.height } : null,
    sizeLabel: size?.label,
    fold: tileFold(cfg),
  });
}

// Какую фальцовку показать на плитке. Калькулятор открывается на первом варианте
// («Без сложения»), но плитка каталога — не состояние конфигуратора, а ОБРАЗ
// продукта: буклет без сложения это листовка, и в ряду плиток он неотличим от
// документа. Поэтому берём самый узнаваемый силуэт из тех, что продукт реально
// предлагает: рулонная фальцовка («Евро», «Улитка») — её завёрнутые внутрь
// крайние панели и есть «буклет» с первого взгляда; из рулонных — с наименьшим
// числом сгибов (Евро, а не Улитка: он каноничнее и не рябит панелями в 177 px).
// Нет рулонной — самая сложенная из прочих. Биговку (`crease`, чертежи)
// исключаем: это продавленная линия, лист остаётся плоским.
function tileFold(cfg: ProductPricing): { folds: number; kind: string } | null {
  const real = (cfg.foldTypes ?? []).filter((f) => f.folds > 0 && f.kind !== "crease");
  if (!real.length) return null;
  const rolled = real.filter((f) => f.kind === "roll");
  const pick = rolled.length
    ? rolled.reduce((a, b) => (b.folds < a.folds ? b : a))
    : real.reduce((a, b) => (b.folds > a.folds ? b : a));
  return { folds: pick.folds, kind: pick.kind };
}

export { productTileSvg } from "./tile";
export { coverTileSvg, defaultCoverTileInput } from "./coverTile";
