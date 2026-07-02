#!/usr/bin/env node
// «Улучшайзер» фото перед заливкой в Directus: авто-контраст, сочность, лёгкая
// резкость. НЕ ресайзит и НЕ жмёт под веб — этим занимается astro:assets на
// сборке (AVIF/WebP q60), поэтому на выходе JPEG q92 как «оригинал» для CMS.
//
// Использование:
//   node scripts/enhance-images.mjs <папка-с-фото> [папка-результата]
//   (по умолчанию результат в <папка-с-фото>/enhanced, исходники не трогаются)
import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";

// Пресет — крутить здесь. Значения умеренные: фото продукции (часто белый фон)
// легко «пережечь» агрессивным контрастом.
const PRESET = {
  normalise: { lower: 1, upper: 99 }, // авто-уровни по перцентилям (мягко)
  saturation: 1.12, // сочность
  brightness: 1.02, // чуть светлее
  sharpen: { sigma: 0.8 }, // лёгкая резкость
  jpegQuality: 92, // почти без потерь; финальное сжатие сделает astro:assets
};

const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

const inDir = process.argv[2];
if (!inDir) {
  console.error("Использование: node scripts/enhance-images.mjs <папка> [папка-результата]");
  process.exit(1);
}
const outDir = process.argv[3] ?? path.join(inDir, "enhanced");

const entries = await readdir(inDir, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile() && EXT.has(path.extname(e.name).toLowerCase()))
  .map((e) => e.name);

if (files.length === 0) {
  console.error(`В ${inDir} нет картинок (${[...EXT].join(", ")})`);
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const kb = (bytes) => `${Math.round(bytes / 1024)} КБ`;
let ok = 0;
let failed = 0;

for (const name of files) {
  const src = path.join(inDir, name);
  const base = path.basename(name, path.extname(name));
  try {
    const img = sharp(src)
      .rotate() // применяем EXIF-ориентацию, иначе после обработки фото ляжет на бок
      .normalise(PRESET.normalise)
      .modulate({ saturation: PRESET.saturation, brightness: PRESET.brightness })
      .sharpen(PRESET.sharpen);

    // PNG с прозрачностью оставляем PNG (лого/графика), фото — в JPEG q92
    const { hasAlpha } = await sharp(src).metadata();
    const dst = path.join(outDir, `${base}${hasAlpha ? ".png" : ".jpg"}`);
    if (hasAlpha) await img.png().toFile(dst);
    else await img.jpeg({ quality: PRESET.jpegQuality, mozjpeg: true }).toFile(dst);

    const [inSize, outSize] = [(await stat(src)).size, (await stat(dst)).size];
    console.log(`✓ ${name} → ${path.basename(dst)} (${kb(inSize)} → ${kb(outSize)})`);
    ok++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log(`\nГотово: ${ok} обработано${failed ? `, ${failed} с ошибками` : ""}. Результат: ${outDir}`);
