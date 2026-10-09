/**
 * Формат чисел в коллекции aura/typography — по имени свойства, не по общим path-эвристикам.
 *
 * Контракт (Figma → токен → CSS):
 * - font-size      → px (обычно alias на scale.*)
 * - font-weight    → число без единицы
 * - line-height    → px (в Figma абсолютные значения)
 * - letter-spacing → px
 */

import { PLUGIN_COLLECTIONS } from './plugin-collections.js';

/** Свойства длиннее первыми: font-weight раньше weight-подобных совпадений. */
const TYPOGRAPHY_PROPERTIES = [
  'font-weight',
  'font-size',
  'font-family',
  'line-height',
  'letter-spacing',
];

/**
 * @param {string} tokenPath e.g. title.h1.font-weight.bold
 * @returns {string | null} canonical property name
 */
export function typographyPropertyFromPath(tokenPath) {
  for (const property of TYPOGRAPHY_PROPERTIES) {
    if (
      tokenPath === property ||
      tokenPath.endsWith(`.${property}`) ||
      tokenPath.includes(`.${property}.`)
    ) {
      return property;
    }
  }
  // font.family.base
  if (/(^|\.)family(\.|$)/.test(tokenPath)) return 'font-family';
  return null;
}

export function isTypographyCollection(collectionName) {
  return collectionName === PLUGIN_COLLECTIONS.typography;
}

/**
 * @returns {string | undefined} CSS-строка, если свойство известно; иначе undefined → общий format
 */
export function formatTypographyNumber(
  tokenValue,
  sourceToken,
  { formatPixels, sanitizeTokenNumber },
) {
  if (!isTypographyCollection(sourceToken.collectionName)) return undefined;

  const property = typographyPropertyFromPath(sourceToken.tokenPath);
  if (!property) return undefined;

  const numberValue = sanitizeTokenNumber(tokenValue);

  switch (property) {
    case 'font-weight':
      return String(numberValue);
    case 'font-size':
    case 'line-height':
    case 'letter-spacing':
      return formatPixels(numberValue);
    case 'font-family':
      return String(numberValue);
    default:
      return undefined;
  }
}
