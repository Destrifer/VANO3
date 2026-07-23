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
  });
}

export { productTileSvg } from "./tile";
export { coverTileSvg, defaultCoverTileInput } from "./coverTile";
