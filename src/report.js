/** Валидации, alias-пути, prune унаследованных полей Aura. */

import { describePresetField } from './paths.js';
import {
  parsePresetTemplate,
  parseTokenExport,
} from './token-export-schema.js';
import { forEachLeafValue, isObject } from './tree.js';

/** Прерываем сборку, если вход не проходит zod-контракт плагина / Aura. */
export function validateInputs(tokenExport, presetTemplate) {
  parseTokenExport(tokenExport);
  parsePresetTemplate(presetTemplate);
}

/** Если поле есть в пресете, ссылку вида {surface.100} можно сохранить как есть. */
export function collectAliasPaths(presetTemplate) {
  const pathsByMode = { common: new Set(), light: new Set(), dark: new Set() };
  forEachLeafValue(presetTemplate, (_, pathSegments) => {
    const { key: tokenPath, mode: themeMode } =
      describePresetField(pathSegments);
    pathsByMode[themeMode].add(tokenPath);
  });

  return pathsByMode;
}

/** Проверяем, что каждая оставленная ссылка существует в Light и Dark без циклов. */
export function validatePresetReferences(resolvedPreset) {
  const valuesByMode = { common: new Map(), light: new Map(), dark: new Map() };
  forEachLeafValue(resolvedPreset, (value, pathSegments) => {
    const { key: tokenPath, mode: themeMode } =
      describePresetField(pathSegments);
    valuesByMode[themeMode].set(tokenPath, value);
  });
  for (const themeMode of ['light', 'dark']) {
    const availableValues = new Map([
      ...valuesByMode.common,
      ...valuesByMode[themeMode],
    ]);
    const verifiedPaths = new Set();
    function verifyReference(tokenPath, visitedPaths = []) {
      if (visitedPaths.includes(tokenPath)) {
        throw new Error(
          `Цикл в ${themeMode}: ${[...visitedPaths, tokenPath].join(' -> ')}`,
        );
      }
      if (verifiedPaths.has(tokenPath)) return;
      if (!availableValues.has(tokenPath)) {
        throw new Error(`В результате нет токена ${tokenPath} (${themeMode}).`);
      }
      for (const reference of String(availableValues.get(tokenPath)).matchAll(
        /\{([^}]+)\}/g,
      )) {
        verifyReference(reference[1], [...visitedPaths, tokenPath]);
      }
      verifiedPaths.add(tokenPath);
    }
    for (const tokenPath of availableValues.keys()) verifyReference(tokenPath);
  }
}

/** definePreset(Aura, overrides) сам подставит неизменённые поля Aura. */
export function omitInheritedAuraFields(tree, inheritedPaths, pathSegments = []) {
  if (!isObject(tree)) return tree;
  return Object.fromEntries(
    Object.entries(tree).flatMap(([fieldName, fieldValue]) => {
      const childPath = [...pathSegments, fieldName];
      if (inheritedPaths.has(childPath.join('.'))) return [];
      const filteredChild = omitInheritedAuraFields(
        fieldValue,
        inheritedPaths,
        childPath,
      );
      return isObject(filteredChild) && Object.keys(filteredChild).length === 0
        ? []
        : [[fieldName, filteredChild]];
    }),
  );
}
