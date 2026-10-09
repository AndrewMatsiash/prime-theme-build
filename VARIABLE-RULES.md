# Правила токенов и CSS-переменных

Контракт для **разработки** (имена `--p-*`, форматы, билдер).  
Гайд для дизайнеров простым языком: [DESIGNER-GUIDE.md](./DESIGNER-GUIDE.md).

Итог в CSS: префикс `--p-` (PrimeUIX). Билдер адаптирует экспорт плагина.

---

## Имена переменных

### Должны

| Правило | Пример |
|---------|--------|
| Только kebab-case после префикса | `--p-title-h1-font-weight-bold` |
| Префикс `--p-` (не `--color-`, не `--font-`) | `--p-scale-1`, `--p-text-color` |
| Semantic / component пути отражают роль | `--p-form-field-background`, `--p-drawer-border-radius` |
| Typography из `aura/typography` → extend | `--p-font-family-base`, `--p-title-h1-line-height` |
| Scale — общая шкала размеров | `--p-scale-1`, `--p-scale-1-75` |

### Не должны

| Антипаттерн | Почему |
|-------------|--------|
| Свои префиксы (`--brand-`, `--ams-`) в теме Prime | Ломает контракт Prime / слой `definePreset` |
| CamelCase в имени CSS-var | Prime нормализует в kebab; в Figma держим иерархию плагина |
| Дубли «почти то же» (`--p-h1-size` и `--p-title-h1-font-size`) | Два источника правды |
| Бренд-одноразовые в `component/*` | Только в `aura/app` / `aura/custom` / standalone |
| Сегмент `figma` в пути токена | Билдер игнорирует (figma-only) |

---

## Значения

### Должны

| Тип | В Figma (число/ссылка) | В CSS |
|-----|------------------------|-------|
| Размер из шкалы | `{scale.1-5}` | `var(--p-scale-1-5)` / rem |
| Цвет semantic | `{surface/0}`, `{text/color}` | `var(--p-surface-0)` и т.п. |
| Font weight | `{weight.700}` | `700` (без `px`) |
| Font size (typography) | `{scale.*}` | через scale |
| Line height | число без единиц (`19.6`) | `19.6px` |
| Opacity | `60` (0–100) или уже `0.6` | `0.6` (`> 1` → делим на 100) |
| Строки (family) | `Inter` | `Inter` |

Числа в плагине **без единиц** (`1`, `14`, `700`, `19.6`) — единицы дописывает билдер (кроме weight).

### Не должны

| Антипаттерн | Почему |
|-------------|--------|
| `700px` / `14px` / `19.6px` строкой в токене | Плагин/билдер ждут number → сами добавят `px` |
| Сырой px для `font-size` вместо `{scale.*}` | Ломает единую шкалу и rem |
| Weight числом в title в обход `{weight.*}` | Дубли палитры весов |
| Alias на несуществующий токен | Билдер инлайнит или падает на validate |
| Line-height с единицами (`19.6px`, `140%`) | В токене только число; билдер добавит `px` |
| Смешивать shorthand и стороны для одного padding | То always `8 12`, то `y`+`x` — разная магия в resolve |
| Tabs `border.width` уже как `0 0 1px 0` | В плагине только число толщины; shorthand делает билдер |

### Line-height в Figma

В токене `line-height` указывается **числом** (`19.6`, `29.4`) — без `px` / `%`.  
Билдер дописывает `px` → `19.6px`.

---

## Куда класть токены

### Должны

| Что | Коллекция |
|-----|-----------|
| Цвета/отступы Aura | `aura/primitive`, `aura/semantic/*`, `aura/component/*` |
| App/custom CSS vars | `aura/app`, `aura/custom` |
| Типографика продукта | `aura/typography` (standalone → extend) |
| Эффекты/тени по контракту плагина | `aura/effects` |

### Не должны

| Антипаттерн | Куда вместо этого |
|-------------|-------------------|
| Новая типографика внутри `component/button` «как получится» | `aura/typography` |
| Одноразовый бренд-цвет в primitive Aura | `app` / `custom` |
| Копировать все поля Aura 1:1 без изменений | Не экспортировать / не переопределять — унаследуется |

---

## Ссылки (aliases)

### Должны

- Ссылаться на токены, которые есть в пресете (primitive / semantic / scale / weight).
- Для light/dark — на токены, доступные в обоих режимах, если поле `common`.

### Не должны

- Цепочки-сироты (`{foo.bar}` без определения).
- Циклические ссылки (`a → b → a`).

---

## Typography checklist (коротко)

1. `font-size` → только `{scale.*}`  
2. `font-weight` → только `{weight.*}`  
3. `line-height` → число без единиц → в CSS с `px`  



4. Новые уровни (`h4`, `caption`) — ок без правок билдера  
5. Новое *свойство* (`font-style`, …) — добавить в `typography-format.js`

---

## Как проверить

```bash
npm test
bxbt-theme-build --config theme.config.js
bxbt-theme-build report --config theme.config.js   # unused / ignored / inherited
```

В report смотреть: `unusedSourceTokens`, `ignoredSourceTokens`, битые alias при падении validate.
