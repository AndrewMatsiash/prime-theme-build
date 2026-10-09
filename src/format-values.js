/**
 * $value из Figma → строка для CSS/пресета.
 * Числа по умолчанию в px; исключения — opacity, scale (rem), font-weight.
 * aura/typography — отдельно по имени свойства (typography-format.js).
 * Спецкейсы Aura — в VALUE_OVERRIDES (не размазывать if по resolve).
 */

import { isObject } from './tree.js';
import { formatTypographyNumber } from './typography-format.js';

/** Figma отдаёт float-шум (25.200000762939453) — приводим к стабильному числу. */
export const sanitizeTokenNumber = (value) =>
  Number(Number(value).toFixed(4));

export const formatPixels = (value) => {
  const pixels = sanitizeTokenNumber(value);
  return pixels === 0 ? '0' : `${pixels}px`;
};

export const formatRemFromPixels = (value, pixelsPerRem) => {
  const rem = sanitizeTokenNumber(value) / pixelsPerRem;
  const rounded = Math.round(rem * 1000) / 1000;
  return `${rounded}rem`;
};

/** В Aura у Tabs граница есть только снизу; JSON задаёт её толщину. */
export const isTabsBottomBorderWidth = (pathSegments) =>
  pathSegments.length === 4 &&
  pathSegments[0] === 'components' &&
  pathSegments[1] === 'tabs' &&
  ['tab', 'tablist'].includes(pathSegments[2]) &&
  pathSegments[3] === 'borderWidth';

/**
 * Исключения после обычного format: path + исходный токен → финальная строка.
 * Плагин не умеет записать shorthand в dimension `width`.
 */
export const VALUE_OVERRIDES = [
  {
    name: 'tabs-bottom-border-only',
    match: (pathSegments, matchedSourceToken) =>
      matchedSourceToken &&
      typeof matchedSourceToken.tokenDefinition.$value === 'number' &&
      isTabsBottomBorderWidth(pathSegments),
    apply: (resolvedValue) => `0 0 ${resolvedValue} 0`,
  },
];

export function applyValueOverrides(
  pathSegments,
  matchedSourceToken,
  resolvedValue,
) {
  for (const rule of VALUE_OVERRIDES) {
    if (rule.match(pathSegments, matchedSourceToken)) {
      return rule.apply(resolvedValue);
    }
  }
  return resolvedValue;
}

/** font-weight вне typography: weight/600, font/weight, …/font-weight/bold. */
const isFontWeightTokenPath = (tokenPath) =>
  tokenPath.startsWith('weight.') ||
  /(^|\.)font\.weight(\.|$)/.test(tokenPath) ||
  /(^|\.)font-weight(\.|$)/.test(tokenPath);

export function formatNumberToken(tokenValue, sourceToken, pixelsPerRem) {
  const fromTypography = formatTypographyNumber(tokenValue, sourceToken, {
    formatPixels,
    sanitizeTokenNumber,
  });
  if (fromTypography !== undefined) return fromTypography;

  const numberValue = sanitizeTokenNumber(tokenValue);
  if (sourceToken.tokenPath.endsWith('opacity')) {
    // Figma/plugin often uses 0–100; values already in 0–1 stay as-is. `1` = opaque.
    const cssOpacity =
      numberValue > 1 ? sanitizeTokenNumber(numberValue / 100) : numberValue;
    return String(cssOpacity);
  }
  if (isFontWeightTokenPath(sourceToken.tokenPath)) return String(numberValue);
  if (sourceToken.tokenPath.startsWith('scale.'))
    return formatRemFromPixels(numberValue, pixelsPerRem);
  return formatPixels(numberValue);
}

/** Тени Figma собираются в одну CSS-строку через запятую. */
export function formatShadowLayers(shadowValue, sourceTokenId) {
  const shadows = Array.isArray(shadowValue)
    ? [...shadowValue].reverse()
    : [shadowValue];
  return shadows
    .map((shadowLayer) => {
      if (
        !['x', 'y', 'blur', 'spread'].every((dimensionName) =>
          Number.isFinite(Number(shadowLayer[dimensionName])),
        ) ||
        typeof shadowLayer.color !== 'string'
      ) {
        throw new Error(`Некорректная тень: ${sourceTokenId}`);
      }
      const cssDimensions = ['x', 'y', 'blur', 'spread'].map((dimensionName) =>
        formatPixels(shadowLayer[dimensionName]),
      );
      return `${shadowLayer.inset ? 'inset ' : ''}${cssDimensions.join(' ')} ${shadowLayer.color}`;
    })
    .join(', ');
}
