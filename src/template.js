/**
 * Форма пресета: Aura + недостающие пути из JSON Figma.
 * Shape helpers → template-shape.js; missing-field heuristics → template-missing.js.
 */

import { camelCaseToTokenPath, normalizeTokenName } from './paths.js';
import {
  PLUGIN_COLLECTIONS,
  THEME_MODES,
  semanticCollection,
} from './plugin-collections.js';
import { getStandaloneCollectionNames } from './token-index.js';
import { forEachLeafValue, isObject } from './tree.js';
import { addMissingFigmaTemplateFields } from './template-missing.js';
import {
  addMissingDirectFields,
  makeTemplateShape,
  mergeMissingTokenPaths,
} from './template-shape.js';

/** Aura задаёт базовую форму, JSON расширяет её проектными полями. */
export function createPresetTemplate(
  auraPreset,
  tokenExport,
  { extendTemplate } = {},
) {
  const presetTemplate = structuredClone(auraPreset);
  const primitiveTokens = tokenExport[PLUGIN_COLLECTIONS.primitive];

  presetTemplate.primitive.scale = makeTemplateShape(
    primitiveTokens.scale ?? {},
  );
  for (const [groupName, groupTokens] of Object.entries(primitiveTokens)) {
    if (isObject(presetTemplate.primitive[groupName])) {
      addMissingDirectFields(presetTemplate.primitive[groupName], groupTokens);
    }
  }

  for (const mode of THEME_MODES) {
    const modeTemplate = presetTemplate.semantic.colorScheme[mode];
    const modeTokens = tokenExport[semanticCollection(mode)];
    addMissingDirectFields(modeTemplate.surface, modeTokens?.surface);
    addMissingDirectFields(modeTemplate.content, modeTokens?.content);
    const auraNavigationPaths = [];
    forEachLeafValue(modeTemplate.navigation, (_, pathSegments) => {
      auraNavigationPaths.push(camelCaseToTokenPath(pathSegments.join('.')));
    });
    for (const [groupName, groupTokens] of Object.entries(
      modeTokens?.navigation ?? {},
    )) {
      const normalizedGroupName = normalizeTokenName(groupName);
      const groupAlreadyInAura = auraNavigationPaths.some(
        (key) =>
          key === normalizedGroupName ||
          key.startsWith(`${normalizedGroupName}.`),
      );
      if (!groupAlreadyInAura) {
        modeTemplate.navigation[normalizedGroupName] =
          makeTemplateShape(groupTokens);
      }
    }
  }

  presetTemplate.extend = makeTemplateShape(
    tokenExport[PLUGIN_COLLECTIONS.app] ?? {},
  );
  mergeMissingTokenPaths(
    presetTemplate.extend,
    makeTemplateShape(tokenExport[PLUGIN_COLLECTIONS.custom] ?? {}),
  );
  for (const name of getStandaloneCollectionNames(tokenExport)) {
    mergeMissingTokenPaths(
      presetTemplate.extend,
      makeTemplateShape(tokenExport[name]),
    );
  }

  addMissingFigmaTemplateFields(presetTemplate, tokenExport);

  if (typeof extendTemplate === 'function') {
    extendTemplate(presetTemplate, tokenExport);
  }

  return presetTemplate;
}
