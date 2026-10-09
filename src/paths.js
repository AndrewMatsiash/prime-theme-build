/** Перевод путей Aura-пресета ↔ пути токенов Figma (плагин PrimeUI). */

import { isObject } from './tree.js';

/** Например, content zone в Figma становится content-zone в пресете. */
export const normalizeTokenName = (tokenName) =>
  tokenName.replace(/\s+/g, '-');

/** borderRadius -> border.radius; formField -> form.field. */
export const camelCaseToTokenPath = (pathValue) =>
  pathValue.replace(/[A-Z]/g, (letter) => `.${letter.toLowerCase()}`);

/**
 * Суффиксы сторон: padding.top / padding.y.
 * Родительский ключ `padding` покрывает стороны в шаблоне.
 */
export const SIDE_TOKEN_SUFFIX = /\.(top|right|bottom|left|x|y)$/;

/**
 * Корень компонента в Aura (`root`), если первый сегмент Figma — свойство, не слот.
 * drawer.border.radius → root; menu.sidebar.padding → слот sidebar.
 */
export const ROOT_LEVEL_PROPERTY_NAMES = [
  'border',
  'background',
  'color',
  'padding',
  'margin',
  'shadow',
  'font',
  'width',
  'height',
  'gap',
  'opacity',
  'transition',
  'focus',
  'outline',
  'size',
];

export const ROOT_LEVEL_TOKEN_PREFIX = new RegExp(
  `^(${ROOT_LEVEL_PROPERTY_NAMES.join('|')})`,
);

export const collapseToCamelKey = (segments) =>
  segments.reduce(
    (name, part, index) =>
      index === 0
        ? part
        : `${name}${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    '',
  );

/**
 * Путь поля пресета → путь токена Figma.
 *
 * @example
 * describePresetField(['components', 'select', 'root', 'borderRadius'])
 * // → { section: 'component', mode: 'common', key: 'select.border.radius' }
 *
 * @example
 * describePresetField(['semantic', 'colorScheme', 'light', 'form', 'field', 'background'])
 * // → { section: 'semantic', mode: 'light', key: 'form.field.background' }
 *
 * @example
 * describePresetField(['extend', 'title', 'h1', 'font-weight', 'bold'])
 * // → { section: 'extend', mode: 'common', key: 'title.h1.font-weight.bold' }
 *
 * @example
 * describePresetField(['extend', 'colorScheme', 'dark', 'modalicon', 'danger', 'background'])
 * // → { section: 'extend', mode: 'dark', key: 'modalicon.danger.background' }
 */
export function describePresetField(presetPathSegments) {
  const [presetSection, ...fieldSegments] = presetPathSegments;

  let themeMode = 'common';
  const colorSchemeIndex = fieldSegments.indexOf('colorScheme');
  if (colorSchemeIndex !== -1) {
    themeMode = fieldSegments[colorSchemeIndex + 1];
    fieldSegments.splice(colorSchemeIndex, 2);
  }

  const tokenPath = fieldSegments
    .filter((segment) => segment !== 'root')
    .join('.');
  return {
    section: presetSection === 'components' ? 'component' : presetSection,
    mode: themeMode,
    key:
      presetSection === 'extend'
        ? tokenPath
        : camelCaseToTokenPath(tokenPath),
  };
}

/**
 * Figma-ключ компонента → сегменты шаблона Aura.
 *
 * @example
 * proposeComponentTemplatePath(components, 'drawer.border.radius')
 * // → ['drawer', 'root', 'borderRadius']
 *
 * @example
 * proposeComponentTemplatePath(components, 'menu.sidebar.padding')
 * // → ['menu', 'sidebar', 'padding']
 */
export function proposeComponentTemplatePath(componentsTemplate, figmaKey) {
  const [componentName, ...rest] = figmaKey.split('.');
  if (!componentName || rest.length === 0) return null;
  if (!isObject(componentsTemplate[componentName])) return null;

  const component = componentsTemplate[componentName];
  const first = rest[0];

  if (Object.hasOwn(component, first) && first !== 'root') {
    const leaf = collapseToCamelKey(rest.slice(1));
    return leaf ? [componentName, first, leaf] : null;
  }

  if (Object.hasOwn(component, 'root') && ROOT_LEVEL_TOKEN_PREFIX.test(first)) {
    return [componentName, 'root', collapseToCamelKey(rest)];
  }

  const leaf = collapseToCamelKey(rest.slice(1));
  return leaf ? [componentName, first, leaf] : [componentName, first];
}

/**
 * Figma-ключ semantic → сегменты шаблона Aura.
 *
 * @example
 * proposeSemanticTemplatePath('overlay.title.font.size')
 * // → ['overlay', 'title', 'fontSize']
 *
 * @example
 * proposeSemanticTemplatePath('navigation.sidebar.padding')
 * // → ['navigation', 'sidebar', 'padding']
 */
export function proposeSemanticTemplatePath(figmaKey) {
  const parts = figmaKey.split('.');
  if (parts.length < 2) return null;
  const [group, ...rest] = parts;
  if (rest.length === 0) return [group];
  if (rest.length === 1) return [group, rest[0]];
  return [group, rest[0], collapseToCamelKey(rest.slice(1))];
}

/**
 * App-components / extend: keep Figma nesting (border.color stays nested).
 *
 * @example
 * proposeExtendTemplatePath('modalicon.danger.border.color')
 * // → ['modalicon', 'danger', 'border', 'color']
 */
export function proposeExtendTemplatePath(figmaKey) {
  const parts = figmaKey.split('.').filter(Boolean);
  if (parts.length < 2) return null;
  return parts;
}
