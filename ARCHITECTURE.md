# Architecture

`bxbt-theme-build` собирает PrimeVue / PrimeUIX preset из JSON-экспорта `primeui-figma-plugin-v4`.

Правила для дизайнеров: [DESIGNER-GUIDE.md](./DESIGNER-GUIDE.md).  
Инженерный контракт переменных: [VARIABLE-RULES.md](./VARIABLE-RULES.md).

Плагин задаёт схему коллекций и путей (`aura/semantic/light`, `form/field/background`, …). Билдер — адаптер: переводит это в форму Aura (`semantic.colorScheme.light…`) и CSS-значения.

## Поток сборки

```
JSON (Figma plugin)
        │
        ▼
┌───────────────────┐
│ createPresetTemplate │  template.js
│ Aura shape + missing │
│ paths from JSON      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ buildPresetFromTokens │  resolve.js
│ lookup → format → fill │
│ validate refs → prune  │
│ → preset + report      │
└─────────┬─────────┘
          │
          ├─► preset module (.ts)
          ├─► optional CSS variables (css-variables.js)
          └─► diff vs previous .ts → reports/diff-history (last 3)
```

Публичная точка входа: `buildPreset()` в `build-preset.js` (вызывает оба шага).

## Модули

| Файл | Зачем |
|------|--------|
| `build-preset.js` | Оркестратор: `buildPreset`, `readTokenJson`, `serializePresetModule` |
| `template.js` | Оркестрация формы: Aura + extend + вызов missing-fields |
| `template-shape.js` | Пустые shape-деревья, merge путей, `setTemplatePath` |
| `template-missing.js` | Эвристики: ключи Figma, которых нет в Aura → слоты шаблона |
| `resolve.js` | Pipeline fill: lookup → format → side-tokens → overrides → report |
| `paths.js` | Aura path ↔ Figma path (`borderRadius` → `border.radius`, без `root` / `colorScheme`) |
| `plugin-collections.js` | Единый контракт имён коллекций плагина (`PLUGIN_COLLECTIONS`) |
| `token-export-schema.js` | Zod: `source` + обязательные коллекции; шаблон Aura |
| `token-index.js` | Плоский индекс коллекций, standalone (`aura/typography`), unused / figma-only |
| `format-values.js` | `$value` → CSS-строка; `VALUE_OVERRIDES` (tabs border и др.) |
| `typography-format.js` | `aura/typography`: format по свойству (`font-weight`, `line-height`, …) |
| `report.js` | Валидация входа и `{aliases}`, prune полей, унаследованных от Aura |
| `tree.js` | Обход деревьев: `mapLeafValues`, `forEachLeafValue`, `isObject` / `isDesignToken` |
| `css-variables.js` | Отдельный шаг: preset → лист CSS-переменных (`prefix`, по умолчанию `--p-*`) |
| `preset-diff.js` | Сравнение пресетов; история последних 3 дельт (`diff` / `diff --history`) |
| `index.js` | Публичные экспорты пакета |

## Контракт плагина (не меняем)

- Коллекции: `aura/primitive`, `aura/semantic/{common,light,dark}`, `aura/component/{…}`, `aura/app-components-common` + `aura/app-components-color-scheme/{light,dark}` (наши виджеты → `extend`), `aura/app`, `aura/custom`, `aura/effects`, плюс standalone (`aura/typography`, …).
- Имена в Figma: иерархия с `/` → в JSON точки / вложенность.
- Числа в дизайне **без единиц**; единицы появляются в билдере.
- Light / Dark — отдельные коллекции (или колонки в UI плагина).

## Что делает адаптер

1. **Пути** — JS-поля Aura ↔ ключи токенов плагина (`paths.js`).
2. **Числа** — по умолчанию `px`; `scale.*` → `rem`; opacity `> 1` → `/100`, иначе как есть; font-weight без единицы (`format-values.js`).
3. **Aliases** — `{surface.0}` оставляем, если токен есть в пресете; иначе инлайним.
4. **Side-tokens** — `padding` можно собрать из `.top/.right/…` или `.y/.x`.
5. **Tabs** — `border.width: 1` → `borderWidth: "0 0 1px 0"` (в Aura граница только снизу; в плагине — одно число).
6. **Extend** — app / custom / standalone → глобальные CSS-переменные.

## Отладка: куда смотреть

| Симптом | Модуль |
|---------|--------|
| Неверный rem / px / weight | `format-values.js` |
| Не нашёл токен / wrong collection | `resolve.js`, `token-index.js` |
| Кривой путь Figma ↔ Aura | `paths.js` |
| Поле не попало в пресет | `template.js` |
| Цикл / битая `{ref}` | `report.js` |
| Нет `--p-*` в SCSS | `css-variables.js` |

## API снаружи

Публичный контракт: импорты из `bxbt-theme-build` / `src/index.js`.

```js
import { buildPreset, diffPresets, writeCssVariables } from 'bxbt-theme-build';
```

Внутренние модули (`paths.js`, `resolve.js`, …) — детали реализации, не стабильный API.

## Типографика (`aura/typography`)

Standalone-коллекция → `extend` / CSS vars. Числа форматируются **по имени свойства**, не общими path-эвристиками:

| Свойство | Формат |
|----------|--------|
| `font-weight` | unitless (`700`) |
| `font-size` | px (обычно alias `{scale.*}`) |
| `line-height` | число из Figma → в CSS с `px` |
| `letter-spacing` | px |

Подробности для дизайна: [VARIABLE-RULES.md](./VARIABLE-RULES.md).

## Тесты

Фикстура: `test/fixtures/design-tokens.json` (экспорт плагина). Тесты не зависят от соседнего `ams.web-ui`.
