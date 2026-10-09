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
| Роли UI (content, form, **navigation**, overlay…) | **Semantic** |
| Компонент Prime (button, tabs…) | **Component** |
| Текстовые стили | **Typography** |
| Не тема Aura — только наше приложение | **App** / **Custom** |

**App/Custom ≠ «всё не-Semantic».** Туда только то, что вне Primitive / Semantic / Component / Typography.

Примеры: `navigation/workspacecard/…` → Semantic · `title/h4` → Typography · отступ «только наша шапка» → App/Custom.

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
