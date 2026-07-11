# Аудит пресетов кластеров (антиканибализация)

Каждый кластер (`promoted_pages`) открывает калькулятор ТОГО ЖЕ продукта, что и хаб.
Чтобы страницы не были копиями друг друга, кластер должен задавать **свой пресет** —
стартовое состояние конфигуратора (`preset` JSON, схема — `CalcPreset` в
`src/composables/calcUrlState.ts`).

Снять актуальное состояние с прода: `python seo/_preset_audit.py`
(колонку «Проверен» скрипт не знает — ведём руками: пустой пресет бывает **осознанным**).

## Статусы

- ✅ **проверен** — пресет обдуман; либо задан, либо осознанно оставлен пустым.
- ⬜ **не проверен** — пресет не разбирали.
- ➖ **пресет не нужен** — у кластера нет своей оси в калькуляторе (различие только
  контентное: срочность, «с логотипом», тематика этикетки). Это ✅ с пустым `preset`.

**Важно:** пустой `preset` ≠ ошибка. Ошибка — когда у кластера ЕСТЬ своя ось
(бумага/размер/форма/переплёт/фальцовка), но она не задана.

## Проверенные разделы

### ✅ `/forms` Бланки (sheet) — 2026-07-10

| Кластер | Пресет | Ось |
|---|---|---|
| `letterhead` | `{"sizeIndex":0,"paperId":1}` | А4 + офсетная (головной интент) |
| `self-copy` | `{"paperId":33}` | самокопирующаяся NCR |
| `bso` | `{"sizeIndex":1}` | А5 |

Закрыт долг из `site-architecture-blanks.md` («пресет бумаги самокопирки — на выверку»).
Тогда же включён `products.allow_custom` (плитка «Свой размер») — флаг продукта,
действует и на хабе, и на всех кластерах.

### ✅ `/stickers` Наклейки (sheet) — 2026-07-10

21 кластер: 17 с пресетом, 4 осознанно без. Дублей пресетов нет.
Скрипт (идемпотентный): `seo/_stickers_clusters_presets_faq.py`.

| Кластер | Пресет | Ось |
|---|---|---|
| `paper` | `{"paperId":17}` | самоклейка полуглянцевая |
| `vinyl` | `{"paperId":21}` | Muflon глянцевая |
| `waterproof` | `{"paperId":20}` | Polylaser глянцевая — **был дубль с `vinyl`** |
| `transparent` | `{"paperId":23}` | Muflon прозрачная |
| `reflective` | `{"paperId":25}` | световозвращающая |
| `void` | `{"paperId":29}` | пломбировочная |
| `transfer` | `{"paperId":30}` | переводная |
| `scratch` | `{"paperId":31}` | скретч-слой |
| `equipment` | `{"paperId":26}` | пластик 3M |
| `packaging` | `{"paperId":18,"sizeIndex":2}` | матовая бумага + 100×100 |
| `qr` | `{"paperId":18,"sizeIndex":0}` | матовая (глянец бликует → скан) + 50×50 |
| `round` | `{"shape":"round"}` | круг |
| `figured` | `{"shape":"complex"}` | контурный рез |
| `rectangular` | `{"sizeIndex":1}` | 70×50 (хаб стартует с 50×50) |
| `laminated` | `{"laminationIndex":0}` | ламинация глянцевая |
| `foil` | `{"foil":true}` | фольгирование |
| `small-run` | `{"quantity":50}` | тираж (дефолт 100) |

➖ **Без пресета осознанно:** `urgent` (срочность — не поле `CalcPreset`), `logo`,
`sticker-packs`, `emblems` (различие контентное).

FAQ: у всех 21 кластера ≥3 вопроса (добавлено 37). Исправлен ответ `faq_items` id 44:
обещал опцию скругления углов в конфигураторе, которой у наклеек нет
(finishing = ламинация ×3 + фольгирование); скругление возможно контуром реза.

### ✅ `/labels` Этикетки (sheet) — 2026-07-11

14 кластеров. Устранён дубль `bottle`/`film` (оба были `paperId:21`), заполнен пустой
`barcode`. Дублей пресетов нет.

| Кластер | Пресет | Ось |
|---|---|---|
| `paper` | `{"paperId":17}` | самоклейка |
| `film` | `{"paperId":20}` | Polylaser глянцевая — **был дубль с `bottle`** |
| `bottle` | `{"paperId":21}` | Muflon глянцевая (влагостойкая, на тару) |
| `transparent` | `{"paperId":23}` | Muflon прозрачная |
| `metallic` | `{"paperId":24}` | Oracal серебряная |
| `barcode` | `{"paperId":18}` | матовая самоклейка (глянец бликует → скан) — **был пустой** |
| `round` | `{"shape":"round"}` | круг |

➖ **Без пресета осознанно:** `urgent` (срочность), и Tier-2 назначение-ниши
`wine`/`beer`/`drinks`/`cosmetics`/`food`/`coffee` — своей оси материала нет,
различие контентное; общий пресет-плёнка склонировал бы их друг с другом.

✅ FAQ (2026-07-11): доведено до ≥3 на всех 14 кластерах (+29 вопросов; `barcode`
был с нуля). Дозаливка вложенным M2M-`create` в `promoted_pages` (создаёт
`faq_items` + связку, существующие не трогает). Раздел закрыт полностью.

## Очередь на проверку

Снимок на 2026-07-10: **137 кластеров / 29 продуктов, 83 пустых пресета.**
Крупные первыми (потенциал канибализации выше там, где кластеров много).

| Продукт | Стратегия | Пустые пресеты | Статус |
|---|---|---|---|
| `/photobooks` Фотокниги | multipage | travel, wedding, baby, urgent, family, corporate | ⬜ |
| `/postcards` Открытки | sheet | photo, logo, urgent, designer, new-year | ⬜ |
| `/tags` Бирки и ярлыки | sheet | luggage, clothing, cable, cardboard, keys | ⬜ |
| `/badges` Бейджи | sheet | medical, metal, plastic, magnet, lanyard | ⬜ |
| `/graduation-albums` Выпускные альбомы | multipage | kindergarten, grade-4, grade-9, grade-11 | ⬜ |
| `/safety-signs` Знаки безопасности | sheet | fire, evacuation, warning, navigation | ⬜ |
| `/blueprints` Чертежи | sheet | a3, folding, copy, project-docs | ⬜ |
| `/books` Книги | multipage | small-batch, children, urgent | ⬜ |
| `/planners` Ежедневники | multipage | logo, engraving, dated | ⬜ |
| `/magazines` Журналы | multipage | glossy, urgent, corporate | ⬜ |
| `/pos-materials` POS-материалы | sheet | wobblers, pricetags, hangers | ⬜ |
| `/docs` Печать документов | sheet | presentations, color, binding | ⬜ |
| `/folders` Папки | fixed | logo, diecut | ⬜ |
| `/invites` Приглашения | sheet | wedding, birthday | ⬜ |
| `/certificates` Сертификаты | sheet | gift, relief | ⬜ |
| `/tickets` Билеты | sheet | lottery, numbered | ⬜ |
| `/business-cards` Визитки | sheet | urgent | ⬜ |
| `/brochures` Брошюры | multipage | urgent | ⬜ |
| `/booklets` Буклеты | sheet | urgent | ⬜ |
| `/catalogs` Каталоги | multipage | urgent | ⬜ |
| `/notebooks` Блокноты | multipage | logo | ⬜ |
| `/copybooks` Тетради | multipage | logo | ⬜ |
| `/menus` Меню | sheet | folder | ⬜ |
| `/envelopes` Конверты | fixed | logo | ⬜ |
| `/diplomas` Дипломы | sheet | thesis | ⬜ |
| `/evacuation-plans` Планы эвакуации | sheet | development | ⬜ |

**Гипотеза для быстрых решений:** `urgent` (10 шт. в разных продуктах) и `logo` —
скорее всего ➖ (нет своей оси, различие в контенте/сроке). Проверить и отметить,
не выдумывая пресет ради пресета.

## Как проверять раздел

1. `python seo/_preset_audit.py` — увидеть пустые.
2. Достать оси продукта (размеры/бумаги/переплёты в порядке индексов):
   `GET /items/products/<id>?fields=sizes.*,papers.papers_id.*,bindings.bindings_id.*`
   — индексы пресета считаются по этому порядку.
3. Сопоставить интент кластера (из `site-architecture-<раздел>.md`) с осью.
4. `PATCH /items/promoted_pages/<id> {"preset": {...}}` — правка контента сама
   триггерит пересборку (Flow «Deploy site on publish»).
5. Проверить в HTML живой страницы: `curl -s https://printmos.ru/<product>/<cluster> | grep -o 'preset&quot;:\[0,{[^]]*'`
6. Отметить раздел здесь ✅ с таблицей пресетов.

## Движок: что учтено

- ✅ `presetPrice()` учитывает `preset.sizeIndex` (коммит `34fb391`) — плитка хаба
  показывает цену своего размера, а не `sizes[0]`.
- ✅ Материалы `status=draft` не попадают в калькулятор и в цену «от» (коммит `59d7114`).
- ✅ **Материал в пресете задаём `paperId`, а не `paperIndex`** (там же). Индекс —
  позиция в M2M: пересортировка материалов молча ломала пресеты. Все пресеты в базе
  мигрированы на `paperId` (проверено 2026-07-10, `paperIndex` не осталось).
  `paperIndex` поддерживается только как legacy-вход.
- ⚠️ `sizeIndex`/`laminationIndex`/`foldTypeIndex` **остаются индексами** — при
  пересортировке размеров/отделки у продукта перепроверить его кластеры.
- ⚠️ `price=0.00` у материала — **не всегда ошибка**: при заполненном `fixed_price`
  (штучные ступени) это норма. См. память `pricing-fixed-price-materials`.
