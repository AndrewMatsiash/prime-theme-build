/**
 * Построение пустой формы (shape) для новых веток токенов.
 * undefined в листе = «потом возьми значение из JSON», не пустая CSS-переменная.
 */

import { normalizeTokenName } from './paths.js';
import { isFigmaOnlyTokenPath } from './token-index.js';
import { isDesignToken, isObject } from './tree.js';

export function makeTemplateShape(sourceNode) {
  if (isDesignToken(sourceNode) || !isObject(sourceNode)) return undefined;
  return Object.fromEntries(
    Object.entries(sourceNode)
      .filter(([tokenName]) => !isFigmaOnlyTokenPath(tokenName))
      .map(([tokenName, childNode]) => [
        normalizeTokenName(tokenName),
        makeTemplateShape(childNode),
      ]),
  );
}

export function mergeMissingTokenPaths(targetShape, sourceShape) {
  for (const [tokenName, childShape] of Object.entries(sourceShape)) {
    if (!Object.hasOwn(targetShape, tokenName))
      targetShape[tokenName] = childShape;
    else if (isObject(targetShape[tokenName]) && isObject(childShape)) {
      mergeMissingTokenPaths(targetShape[tokenName], childShape);
    }
  }
}

export function addMissingDirectFields(targetShape, sourceGroup) {
  if (!isObject(sourceGroup) || isDesignToken(sourceGroup)) return;
  for (const [tokenName, tokenDefinition] of Object.entries(sourceGroup)) {
    if (!isDesignToken(tokenDefinition) || isFigmaOnlyTokenPath(tokenName))
      continue;
    const normalizedTokenName = normalizeTokenName(tokenName);
    if (!Object.hasOwn(targetShape, normalizedTokenName)) {
      targetShape[normalizedTokenName] = undefined;
    }
  }
}

export const setTemplatePath = (target, pathSegments) => {
  let node = target;
  for (let index = 0; index < pathSegments.length - 1; index++) {
    const key = pathSegments[index];
    if (!isObject(node[key])) node[key] = {};
    node = node[key];
  }
  const leaf = pathSegments.at(-1);
  if (!Object.hasOwn(node, leaf)) node[leaf] = undefined;
};
