// Лайтбокс галереи на PhotoSwipe v5. Превью остаются статическими
// <a.gallery__link> с <picture> (avif+srcset) — см. Gallery.astro; SEO и LCP не
// страдают. Этот модуль грузится в простое (requestIdleCallback из BaseLayout),
// а тяжёлое ядро photoswipe — динамическим импортом только при открытии.
// Свайп/зум/стрелки/счётчик/доступность — из коробки; пропорции разных кадров
// обрабатываются корректно (полноэкранная сцена, без скачка).
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import "./gallery-lightbox.css";

const lightbox = new PhotoSwipeLightbox({
  gallery: ".gallery", // каждая .gallery — своя группа листания (важно для /works)
  children: "a.gallery__link",
  pswpModule: () => import("photoswipe"), // ядро только при первом открытии
  // PhotoSwipe сам подхватит data-pswp-srcset (наш avif) и data-pswp-width/height
  // Отступы сцены вокруг картинки: на мобиле скромнее, на десктопе просторнее,
  // снизу чуть больше — под подпись.
  paddingFn: (viewportSize) => {
    const p = viewportSize.x < 640 ? 16 : 48;
    return { top: p, bottom: p + 36, left: p, right: p };
  },
});

// Подпись из data-caption под фото.
lightbox.on("uiRegister", () => {
  lightbox.pswp!.ui!.registerElement({
    name: "pm-caption",
    order: 9,
    isButton: false,
    appendTo: "root",
    onInit: (el, pswp) => {
      const update = () => {
        const a = pswp.currSlide?.data?.element as HTMLElement | undefined;
        const text = a?.dataset?.caption || "";
        el.textContent = text;
        el.style.display = text ? "block" : "none";
      };
      pswp.on("change", update);
      update();
    },
  });
});

lightbox.init();
