# Правила для дизайнеров (обязательные)

Только **PrimeUI-плагин** в Figma. Отклонения ломают тему в коде.  
Не хватает правила под задачу — **не импровизируйте**, спросите разработку.

---

## 1. Жёсткие запреты

| Запрещено | Делайте так |
|-----------|-------------|
| Единицы в значении: `14px`, `19.6px`, `1rem`, `140%`, `700px` | Только число: `14`, `19.6`, `700` |
| Свой `font-size` мимо scale | Ссылка на `scale/…` |
| `font-weight` числом в стиле текста | Ссылка на `weight/…` |
| Текст внутри Component | Только **Typography** |
| Бренд-токены в Primitive | **App** или **Custom** |
| Дублировать существующий токен | Сослаться на него |
| Битая ссылка | Сначала создать токен / выбрать существующий |
| Ссылка на Component из Semantic / Typography / App / Primitive | Только сверху вниз (см. §4) |
| CSS-shorthand в числовом поле (`0 0 1px 0`) или смесь (`bold 16px Inter`) | Одно поле = одно значение. Tabs → border → width — только число |
| Переименовывать пути Aura (`form/field/background`) | Менять только значение справа |
| Пробелы в именах (`content zone`) | Без пробелов: `content-zone` / `workspacecard` |

---

## 2. Как называть

Путь в Figma (`navigation/sidebar/padding`) → в коде `--p-navigation-sidebar-padding`.

| Можно | Нельзя |
|-------|--------|
| Латиница, без пробелов | `content zone`, кириллица, эмодзи |
| Иерархия уровнями: `navigation` → `sidebar` → `padding` | Имя экрана: `page-home-header-bg` |
| Один стиль: везде `workspacecard` **или** везде `workspace-card` | Мешать оба |
| Существующие пути Aura как есть | Выдумывать `formFieldBg` вместо `form/field/…` |

---

## 3. Куда класть

| Относится к… | Куда |
|--------------|------|
| Палитра / `scale` / `weight` | **Primitive** |
| Часть интерфейса, не виджет Prime (content, form, navigation, overlay, карточка, иконка модалки) | **Semantic** |
| Компонент Prime — виджет из Aura/PrimeVue (`button`, `tabs`, `dialog`…). Не любой наш блок UI | **Component** |
| Текстовые стили | **Typography** |
| Не тема Aura — только наше приложение | **App** / **Custom** |

**Проверка:** в коде есть `<Button>` / `<Dialog>` Prime? Да → Component. Нет, свой блок? → Semantic или Custom.

**Primitive** — сырая палитра, без смысла «это фон кнопки». Только ступени: `surface/0…950`, `scale/…`, `weight/…`. На них ссылаются все остальные.  
Пример: `scale/1-5`, `weight/700`, `surface/50` → `--p-scale-1-5`, `--p-weight-700`, `--p-surface-50`.  
Бренд и разовые цвета продукта сюда нельзя: Primitive — общая шкала Aura, на неё ссылаются Semantic и Component. Если положить туда цвет логотипа, он притворится «ступенью палитры», его начнут переиспользовать не туда, и его нельзя будет убрать, не сломав чужие ссылки. Такой цвет → App/Custom.  
Новую ступень внутри уже существующих групп (`scale/1-75`, `surface/25`) можно: билдер дописывает поля в `scale` / `weight` / `surface`. Новую группу (`brand`, `spacing`) — только с DEV: в Aura её нет, билдер не создаст, CSS-переменной не будет.

**Semantic** — смысл в интерфейсе, не имя виджета Prime. Повторяется как роль: фон контента, поле формы, сайдбар, карточка воркспейса, иконка в модалке.  
Пример: `modalicon/danger/background` → `--p-modalicon-danger-background`.

**Component** — только готовые виджеты Prime, которые уже есть в Aura: `button`, `tabs`, `dialog`, `drawer`, `inputtext`, `select`, `checkbox`… Кладите поля, которые Aura знает (фон, цвет, радиус, padding, border) и только то, что реально отличается от Aura: весь `button` копировать не нужно.  
Нельзя выдумать `modalicon` / `workspacecard` — такого виджета в Prime нет, билдер проигнорирует, CSS-переменной не будет.

**App / Custom** — разовое «только наше приложение», не общая роль темы. Не карточка и не поле, а например полоска бренда в шапке.  
Пример: `header/brand-stripe` → `--p-header-brand-stripe`.  
App/Custom ≠ «всё не-Semantic»: туда только то, что вне Primitive / Semantic / Component / Typography.

Ещё: `title/h4` → Typography.

### Common или Color Scheme

В плагине у Semantic и Component две полки: **common** (одно значение на обе темы) и **color scheme** (light / dark).

| Куда | Когда |
|------|--------|
| Component **common** | Уже есть Prime-компонент (`button`, `dialog`, …) и значение **одно** на light и dark (радиус, отступ) |
| Component **color scheme** | Тот же Prime-компонент, но цвет **разный** в light / dark |
| Semantic **common** | Не виджет Prime, значение **одно** на обе темы (`overlay/title`) |
| Semantic **color scheme** | Не виджет Prime, цвета **разные** в light / dark (`workspacecard`, `modalicon`) |

Новые коллекции (кроме Typography) — только с разработкой.

### Без DEV / только с DEV

| Можно самим | Только после согласования с DEV |
|-------------|-------------------------------|
| Новый уровень Typography (`h4`, `caption`) с теми же полями | Новое **свойство** (`font-style`, `paragraph-spacing`, …) |
| Новая ступень `scale` / `weight` / `surface` | Новая коллекция |
| Новое значение у существующего токена (Light/Dark) | Токен «для одного экрана» не в App/Custom |
| Продуктовый токен в App/Custom | Менять смысл имён Aura |

---

## 4. Ссылки — только сверху вниз

```
Component  ──►  Semantic  ──►  Primitive
                  ▲
Typography ───────┤
App / Custom ─────┘
```

| Кто | Может → | Не может → |
|-----|---------|------------|
| Component | Primitive, Semantic | — |
| Semantic | Primitive, Semantic | **Component** |
| Typography / App / Custom | Primitive, Semantic | **Component** |
| Primitive | Primitive | Semantic, Component |

Ок: `button/…/background` → `{surface/0}`.  
Нельзя: `content/background` → `{button/…}`.

---

## 5. Значения полей

| Поле | Можно | Нельзя |
|------|-------|--------|
| Цвет | Ссылка `surface/0`, `content/…` | Component-ссылка; лишний hex, если цвет уже в палитре |
| `font-size` | `scale/…` | Сырое `16`, `24` |
| `font-weight` | `weight/…` | `700` в самом title/text |
| `line-height` | Число `19.6`, `29.4` | `19.6px`, `140%` |
| Отступы / радиусы / tabs width | Число `1`, `8` | Shorthand `0 0 1px 0` |
| `font-family` | `Inter` | Стеки без согласования |

**Typography** — только текст. У стиля: `font-size` → scale, `font-weight` → weight, `line-height` → число.

**Light / Dark:** меняете цвет — проверьте обе колонки.  
**Component:** меняйте только то, что реально отличается от Aura; не копируйте весь компонент.

---

## 6. Чеклист перед экспортом

- [ ] Числа без `px` / `%` / `rem`
- [ ] `font-size` → `scale/…`, `font-weight` → `weight/…`, `line-height` → число
- [ ] Текст только в Typography
- [ ] Имена без пробелов; пути Aura не переименованы
- [ ] Ссылки только вниз (не на Component снаружи)
- [ ] Нет битых ссылок; Light/Dark согласованы
- [ ] Новые свойства / коллекции — только после DEV

Не экспортируйте, пока чеклист не закрыт. Не укладывается в правила → стоп → разработка.
