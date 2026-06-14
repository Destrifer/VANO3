Фото оборудования для блока «Производство и оборудование» на /o-nas.

Сейчас лежат нейтральные плейсхолдеры (webp, 4:3). Чтобы поставить реальное фото —
просто перезапиши нужный файл по тому же имени (формат webp, ориентир 600×450,
object-fit: cover обрежет до 4:3).

Соответствие файлов оборудованию (slug → модель), пути заданы в массиве equipment
в src/pages/o-nas.astro:
  xerox.webp              — Цифровые ЦПМ Xerox
  offset.webp             — Офсетная машина
  riso-3500.webp          — Ризограф RISO 3500 EP
  ideal-6550.webp         — Гильотина IDEAL 6550-95 EP
  graphtec-ce6000.webp    — Плоттер Graphtec CE6000
  marchetti-vicking.webp  — Скругление углов Marchetti Vicking
  duplo-dbm120.webp       — Брошюровщик Duplo DBM-120
  aurora-w6500a.webp      — Термоклей Aurora W6500A
  nagel-foldnak-m2.webp   — Буклетмейкер Nagel Foldnak M2
  office-kit.webp         — Пружина Office Kit
  cyklos-gpm315.webp      — Биговщик-перфоратор Cyklos GPM 315
  fastbind-c400.webp      — Fastbind C400
  mini-perfo-500.webp     — Мини Перфо 500
  gmp-laminators.webp     — Ламинаторы GMP Excelam-655 Q / Surelam PRO 500D
  taechang-tic800.webp    — Тиснение фольгой TaeChang TIC-800TM
  piccolo.webp            — Люверсовщик Piccolo

Быстрая конвертация исходника в webp нужного размера:
  npx sharp-cli -i photo.jpg -o xerox.webp resize 600 450 --fit cover
(или любой другой инструмент; важно сохранить имя файла и формат webp).
