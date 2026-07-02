// Лайтбокс галереи на PhotoSwipe v5. Превью остаются статическими
// <a.gallery__link> с <picture> (avif+srcset) — см. Gallery.astro; SEO и LCP не
// страдают. Этот модуль грузится в простое (requestIdleCallback из BaseLayout),
// а тяжёлое ядро photoswipe — динамическим импортом только при открытии.
// Свайп/зум/стрелки/счётчик/доступность — из коробки; пропорции разных кадров
// обрабатываются корректно (полноэкранная сцена, без скачка).
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import "./gallery-lightbox.css";

// :not([hidden]) — чтобы отфильтрованные на /works карточки не попадали в
// листание лайтбокса (фильтр прячет figure через [hidden]).
const CHILDREN = ".gallery__item:not([hidden]) a.gallery__link";

const lightbox = new PhotoSwipeLightbox({
  gallery: ".gallery", // каждая .gallery — своя группа листания (важно для /works)
  children: CHILDREN,
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

// НЕ lightbox.init(): он привязывает click к самим элементам .gallery, а на
// карточке продукта галерея — слот Vue-острова (ProductConfigurator client:load):
// при гидрации Vue пересоздаёт DOM, элемент подменяется и привязка теряется →
// клик уходил в нативную ссылку (открывался оригинал фото). Поэтому делегируем
// клики на document — его никто не подменяет, — а группу (.gallery) и индекс
// вычисляем в момент клика. Открываем через lightbox.loadAndOpen() (штатный API).
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || ("pswp" in window && window.pswp)) return; // уже открыт/обработан
  // модификаторы/не-левая кнопка — нативное «открыть в новой вкладке»
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return;
  const link = (e.target as HTMLElement | null)?.closest?.(
    ".gallery a.gallery__link",
  ) as HTMLAnchorElement | null;
  const gallery = link?.closest<HTMLElement>(".gallery");
  if (!link || !gallery) return;
  const index = [...gallery.querySelectorAll(CHILDREN)].indexOf(link);
  if (index < 0) return; // скрытая фильтром карточка — не наш случай
  e.preventDefault();
  const point = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : null;
  lightbox.loadAndOpen(index, { gallery }, point ?? undefined);
});
