/**
 * Заполнение шаблона пресета значениями из JSON Figma.
 *
 * Pipeline на каждое leaf-поле:
 * 1. describePresetField — путь Aura → ключ Figma + mode
 * 2. findTokenForPresetField — поиск по коллекциям (порядок = приоритет)
 * 3. иначе combineSideTokens — сборка из .top/.right… или .y/.x
 * 4. convertTokenValue — number/alias/shadow → CSS-строка
 * 5. applyValueOverrides — штучные исключения (tabs border)
 * 6. иначе inherit Aura / keep template + запись в report
 * В конце: validatePresetReferences → prune inherited → summary.
 */

import {
  applyValueOverrides,
  formatNumberToken,
  formatShadowLayers,
} from './format-values.js';
import { describePresetField } from './paths.js';
import {
  collectAliasPaths,
  omitInheritedAuraFields,
  validateInputs,
  validatePresetReferences,
} from './report.js';
import {
  collectionsForAliasLookup,
  collectionsForExtend,
  collectionsForPresetSection,
} from './plugin-collections.js';
import {
  findUnusedSourceTokens,
  getStandaloneCollectionNames,
  indexSourceCollections,
} from './token-index.js';
import { forEachLeafValue, hasNestedPath, isObject, mapLeafValues } from './tree.js';

const INVALID_TOKEN_VALUE = /#NaN|NaNNaN/i;

function collectInvalidTokenValues(resolvedPreset) {
  const invalid = [];
  forEachLeafValue(resolvedPreset, (value, pathSegments) => {
    if (typeof value === 'string' && INVALID_TOKEN_VALUE.test(value)) {
      invalid.push({ path: pathSegments.join('.'), value });
    }
  });
  return invalid;
}

export const DEFAULT_PIXELS_PER_REM = 14;

/** Порядок склейки shorthand из сторонних токенов. */
export const SIDE_TOKEN_GROUPS = [
  ['top', 'right', 'bottom', 'left'],
  ['y', 'x'],
];

/** Заполняем форму пресета значениями JSON и формируем отчёт о сопоставлении. */
export function buildPresetFromTokens(
  tokenExport,
  presetTemplate,
  baseAuraPreset,
  { pixelsPerRem = DEFAULT_PIXELS_PER_REM } = {},
) {
  validateInputs(tokenExport, presetTemplate);

  const { indexedCollections, ignoredSourceTokens } =
    indexSourceCollections(tokenExport);
  const standaloneCollectionNames = getStandaloneCollectionNames(tokenExport);
  const usedTokenIds = new Set();
  const keptFromTemplate = [];
  const inheritedFromAura = [];
  let replacedFieldCount = 0;

  const availablePathsByMode = collectAliasPaths(presetTemplate);

  function findTokenInCollections(collectionNames, tokenPath) {
    for (const collectionName of collectionNames) {
      const tokenDefinition = indexedCollections
        .get(collectionName)
        ?.get(tokenPath);
      if (tokenDefinition)
        return {
          tokenDefinition,
          tokenPath,
          collectionName,
          id: `${collectionName}/${tokenPath}`,
        };
    }
  }

  function findTokenForPresetField(tokenPath, presetField) {
    const { section, mode } = presetField;
    const candidateCollections =
      section === 'extend'
        ? collectionsForExtend(standaloneCollectionNames, mode)
        : collectionsForPresetSection(section, mode);
    return findTokenInCollections(candidateCollections, tokenPath);
  }

  function findReferencedToken(tokenPath, themeMode) {
    return findTokenInCollections(
      collectionsForAliasLookup(themeMode, standaloneCollectionNames),
      tokenPath,
    );
  }

  function convertTokenValue(
    matchedSourceToken,
    presetField,
    visitedTokenIds = [],
  ) {
    if (visitedTokenIds.includes(matchedSourceToken.id)) {
      throw new Error(
        `Циклическая ссылка: ${[...visitedTokenIds, matchedSourceToken.id].join(' -> ')}`,
      );
    }
    usedTokenIds.add(matchedSourceToken.id);
    const { $value: tokenValue } = matchedSourceToken.tokenDefinition;
    const nextVisitedTokenIds = [...visitedTokenIds, matchedSourceToken.id];

    if (typeof tokenValue === 'number') {
      return formatNumberToken(tokenValue, matchedSourceToken, pixelsPerRem);
    }

    if (typeof tokenValue === 'string') {
      return tokenValue.replace(
        /\{([^}]+)\}/g,
        (referenceWithBraces, referencedTokenPath) => {
          const aliasExistsInMode =
            presetField.mode === 'common'
              ? availablePathsByMode.light.has(referencedTokenPath) &&
                availablePathsByMode.dark.has(referencedTokenPath)
              : availablePathsByMode[presetField.mode].has(referencedTokenPath);
          if (
            availablePathsByMode.common.has(referencedTokenPath) ||
            aliasExistsInMode
          )
            return referenceWithBraces;
          const referencedToken = findReferencedToken(
            referencedTokenPath,
            presetField.mode,
          );
          if (!referencedToken) {
            throw new Error(
              `Не найдена ссылка ${referenceWithBraces} в ${matchedSourceToken.id}`,
            );
          }
          return convertTokenValue(
            referencedToken,
            presetField,
            nextVisitedTokenIds,
          );
        },
      );
    }

    if (
      matchedSourceToken.tokenPath.endsWith('shadow') &&
      isObject(tokenValue)
    ) {
      return formatShadowLayers(tokenValue, matchedSourceToken.id);
    }
    throw new Error(`Неподдерживаемое значение: ${matchedSourceToken.id}`);
  }

  function combineSideTokens(tokenPath, presetField) {
    for (const sideNames of SIDE_TOKEN_GROUPS) {
      const sideTokens = sideNames.map((side) =>
        findTokenForPresetField(`${tokenPath}.${side}`, presetField),
      );
      if (sideTokens.every(Boolean)) {
        return sideTokens
          .map((token) => convertTokenValue(token, presetField))
          .join(' ');
      }
    }
  }

  const resolvedPreset = mapLeafValues(
    presetTemplate,
    (auraFallbackValue, presetPathSegments) => {
      const presetField = describePresetField(presetPathSegments);
      const matchedSourceToken = findTokenForPresetField(
        presetField.key,
        presetField,
      );
      const resolvedValue = matchedSourceToken
        ? convertTokenValue(matchedSourceToken, presetField)
        : combineSideTokens(presetField.key, presetField);
      if (resolvedValue !== undefined) {
        replacedFieldCount++;
        return applyValueOverrides(
          presetPathSegments,
          matchedSourceToken,
          resolvedValue,
        );
      }
      const fieldReportEntry = {
        path: presetPathSegments.join('.'),
        value: auraFallbackValue,
      };
      if (hasNestedPath(baseAuraPreset, presetPathSegments))
        inheritedFromAura.push(fieldReportEntry);
      else keptFromTemplate.push(fieldReportEntry);
      return auraFallbackValue;
    },
  );

  validatePresetReferences(resolvedPreset);
  const inheritedPaths = new Set(inheritedFromAura.map(({ path }) => path));

  const unusedSourceTokens = findUnusedSourceTokens(
    indexedCollections,
    usedTokenIds,
  );
  const invalidTokenValues = collectInvalidTokenValues(resolvedPreset);
  if (invalidTokenValues.length > 0) {
    const sample = invalidTokenValues
      .slice(0, 5)
      .map(({ path, value }) => `${path}=${value}`)
      .join('; ');
    throw new Error(
      `Некорректные значения токенов (${invalidTokenValues.length}): ${sample}`,
    );
  }
  return {
    preset: omitInheritedAuraFields(resolvedPreset, inheritedPaths),
    report: {
      summary: {
        totalFields:
          replacedFieldCount +
          keptFromTemplate.length +
          inheritedFromAura.length,
        replacedFromSource: replacedFieldCount,
        keptFromTemplate: keptFromTemplate.length,
        inheritedFromAura: inheritedFromAura.length,
        unusedSourceTokens: unusedSourceTokens.length,
        ignoredSourceTokens: ignoredSourceTokens.length,
        invalidTokenValues: invalidTokenValues.length,
      },
      keptFromTemplate,
      inheritedFromAura,
      unusedSourceTokens,
      ignoredSourceTokens,
      invalidTokenValues,
    },
  };
}
