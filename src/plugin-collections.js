/**
 * Контракт имён коллекций в JSON `primeui-figma-plugin-v4`.
 *
 * Не выводится из объекта Aura: у пресета есть primitive/semantic/components,
 * а app / custom / effects — только в экспорте плагина → уходят в extend.
 */

export const THEME_MODES = ['light', 'dark'];

export const PLUGIN_COLLECTIONS = {
  primitive: 'aura/primitive',
  semantic: {
    common: 'aura/semantic/common',
    light: 'aura/semantic/light',
    dark: 'aura/semantic/dark',
  },
  /** В пресете секция называется components; в плагине — aura/component/*. */
  component: {
    common: 'aura/component/common',
    light: 'aura/component/light',
    dark: 'aura/component/dark',
  },
  app: 'aura/app',
  custom: 'aura/custom',
  effects: 'aura/effects',
  /** Standalone → extend; формат чисел — по имени свойства (см. format-values). */
  typography: 'aura/typography',
};

export const SEMANTIC_PREFIX = 'aura/semantic/';
export const COMPONENT_PREFIX = 'aura/component/';

export const SEMANTIC_COLLECTIONS = Object.values(PLUGIN_COLLECTIONS.semantic);
export const COMPONENT_COLLECTIONS = Object.values(PLUGIN_COLLECTIONS.component);

/** `aura/semantic/light` → `light`; common/unknown → `common`. */
export function themeModeFromCollectionName(collectionName) {
  if (collectionName.endsWith('/light')) return 'light';
  if (collectionName.endsWith('/dark')) return 'dark';
  return 'common';
}

/** Обязательны в любом валидном экспорте. */
export const REQUIRED_COLLECTIONS = [
  PLUGIN_COLLECTIONS.primitive,
  PLUGIN_COLLECTIONS.semantic.common,
  PLUGIN_COLLECTIONS.component.common,
];

/**
 * Источники для preset.extend (порядок: app → custom → …standalone → effects).
 * standalone подставляется между custom и effects при резолве.
 */
export const EXTEND_BUILTIN_COLLECTIONS = [
  PLUGIN_COLLECTIONS.app,
  PLUGIN_COLLECTIONS.custom,
  PLUGIN_COLLECTIONS.effects,
];

/** Имена, которые не считаются standalone-коллекциями. */
export const BUILTIN_COLLECTION_NAMES = [
  PLUGIN_COLLECTIONS.primitive,
  ...EXTEND_BUILTIN_COLLECTIONS,
];

export const semanticCollection = (mode) => PLUGIN_COLLECTIONS.semantic[mode];
export const componentCollection = (mode) => PLUGIN_COLLECTIONS.component[mode];

/** Коллекции для заполнения поля секции пресета (порядок = приоритет поиска). */
export function collectionsForPresetSection(section, mode) {
  if (section === 'primitive') return [PLUGIN_COLLECTIONS.primitive];
  if (section === 'semantic') {
    return [
      PLUGIN_COLLECTIONS.semantic[mode],
      PLUGIN_COLLECTIONS.semantic.common,
      PLUGIN_COLLECTIONS.effects,
    ];
  }
  if (section === 'component') {
    return [
      PLUGIN_COLLECTIONS.component[mode],
      PLUGIN_COLLECTIONS.component.common,
      PLUGIN_COLLECTIONS.effects,
    ];
  }
  return [];
}

/** Порядок поиска при резолве alias `{…}`. */
export function collectionsForAliasLookup(themeMode, standalone = []) {
  return [
    PLUGIN_COLLECTIONS.primitive,
    PLUGIN_COLLECTIONS.semantic[themeMode],
    PLUGIN_COLLECTIONS.semantic.common,
    PLUGIN_COLLECTIONS.component[themeMode],
    PLUGIN_COLLECTIONS.component.common,
    PLUGIN_COLLECTIONS.effects,
    PLUGIN_COLLECTIONS.app,
    PLUGIN_COLLECTIONS.custom,
    ...standalone,
  ];
}

/** Порядок поиска для полей extend. */
export function collectionsForExtend(standalone = []) {
  return [
    PLUGIN_COLLECTIONS.app,
    PLUGIN_COLLECTIONS.custom,
    ...standalone,
    PLUGIN_COLLECTIONS.effects,
  ];
}
