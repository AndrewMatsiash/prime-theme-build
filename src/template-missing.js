/**
 * Поля из Figma, которых нет в Aura, сами попадают в шаблон
 * (без ручного extendTemplate).
 */

import {
  describePresetField,
  proposeComponentTemplatePath,
  proposeExtendTemplatePath,
  proposeSemanticTemplatePath,
  SIDE_TOKEN_SUFFIX,
} from './paths.js';
import {
  APP_COMPONENTS_COLLECTIONS,
  COMPONENT_COLLECTIONS,
  SEMANTIC_COLLECTIONS,
  themeModeFromCollectionName,
} from './plugin-collections.js';
import { indexCollectionTokens, isFigmaOnlyTokenPath } from './token-index.js';
import { forEachLeafValue, isObject } from './tree.js';
import { setTemplatePath } from './template-shape.js';

const collectRepresentedTokenKeys = (presetSection, tree) => {
  const keys = new Set();
  forEachLeafValue(tree, (_, pathSegments) => {
    const { key } = describePresetField([presetSection, ...pathSegments]);
    if (key) keys.add(key);
  });
  return keys;
};

const collectRepresentedTokenKeysByMode = (presetSection, tree) => {
  const keysByMode = { common: new Set(), light: new Set(), dark: new Set() };
  forEachLeafValue(tree, (_, pathSegments) => {
    const { key, mode } = describePresetField([presetSection, ...pathSegments]);
    if (key && keysByMode[mode]) keysByMode[mode].add(key);
  });
  return keysByMode;
};

/** Common applies to both modes; light/dark must not block each other. */
const representedKeysForMode = (keysByMode, mode) => {
  if (mode === 'common') {
    return new Set([
      ...keysByMode.common,
      ...keysByMode.light,
      ...keysByMode.dark,
    ]);
  }
  return new Set([...keysByMode.common, ...keysByMode[mode]]);
};

const isTokenCoveredByTemplate = (figmaKey, representedKeys) => {
  if (representedKeys.has(figmaKey)) return true;
  const sideMatch = figmaKey.match(SIDE_TOKEN_SUFFIX);
  if (!sideMatch) return false;
  return representedKeys.has(figmaKey.slice(0, -sideMatch[0].length));
};

function addMissingKeysFromSourceCollection({
  sourceCollection,
  representedKeys,
  proposePath,
  assignPath,
}) {
  if (!isObject(sourceCollection)) return;
  const sourceTokens = indexCollectionTokens(sourceCollection);

  for (const figmaKey of sourceTokens.keys()) {
    if (isFigmaOnlyTokenPath(figmaKey)) continue;

    const keyToAdd = SIDE_TOKEN_SUFFIX.test(figmaKey)
      ? figmaKey.replace(SIDE_TOKEN_SUFFIX, '')
      : figmaKey;

    if (isTokenCoveredByTemplate(figmaKey, representedKeys)) continue;
    if (representedKeys.has(keyToAdd)) continue;

    const pathSegments = proposePath(keyToAdd);
    if (!pathSegments) continue;

    assignPath(pathSegments, keyToAdd);
    representedKeys.add(keyToAdd);
  }
}

export function addMissingFigmaTemplateFields(presetTemplate, tokenExport) {
  const componentKeys = collectRepresentedTokenKeys(
    'components',
    presetTemplate.components,
  );
  for (const collectionName of COMPONENT_COLLECTIONS) {
    addMissingKeysFromSourceCollection({
      sourceCollection: tokenExport[collectionName],
      representedKeys: componentKeys,
      proposePath: (figmaKey) =>
        proposeComponentTemplatePath(presetTemplate.components, figmaKey),
      assignPath: (pathSegments) =>
        setTemplatePath(presetTemplate.components, pathSegments),
    });
  }

  const semanticKeysByMode = collectRepresentedTokenKeysByMode(
    'semantic',
    presetTemplate.semantic,
  );
  for (const collectionName of SEMANTIC_COLLECTIONS) {
    const mode = themeModeFromCollectionName(collectionName);
    const representedKeys = representedKeysForMode(semanticKeysByMode, mode);
    addMissingKeysFromSourceCollection({
      sourceCollection: tokenExport[collectionName],
      representedKeys,
      proposePath: proposeSemanticTemplatePath,
      assignPath: (pathSegments, keyToAdd) => {
        const templatePath =
          mode === 'common'
            ? pathSegments
            : ['colorScheme', mode, ...pathSegments];
        setTemplatePath(presetTemplate.semantic, templatePath);
        if (keyToAdd) semanticKeysByMode[mode].add(keyToAdd);
      },
    });
  }

  // App Components → extend / extend.colorScheme.{light,dark}
  if (!isObject(presetTemplate.extend)) presetTemplate.extend = {};
  const extendKeysByMode = collectRepresentedTokenKeysByMode(
    'extend',
    presetTemplate.extend,
  );
  for (const collectionName of APP_COMPONENTS_COLLECTIONS) {
    const mode = themeModeFromCollectionName(collectionName);
    const representedKeys = representedKeysForMode(extendKeysByMode, mode);
    addMissingKeysFromSourceCollection({
      sourceCollection: tokenExport[collectionName],
      representedKeys,
      proposePath: proposeExtendTemplatePath,
      assignPath: (pathSegments, keyToAdd) => {
        const templatePath =
          mode === 'common'
            ? pathSegments
            : ['colorScheme', mode, ...pathSegments];
        setTemplatePath(presetTemplate.extend, templatePath);
        if (keyToAdd) extendKeysByMode[mode].add(keyToAdd);
      },
    });
  }
}
