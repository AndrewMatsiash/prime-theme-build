/** Индекс коллекций экспорта Figma: поиск, unused, figma-only. */

import { normalizeTokenName } from "./paths.js";
import {
  BUILTIN_COLLECTION_NAMES,
  COMPONENT_PREFIX,
  SEMANTIC_PREFIX,
  isAppComponentsCollection,
} from "./plugin-collections.js";
import { isDesignToken, isObject } from "./tree.js";

export const isFigmaOnlyTokenPath = (tokenPath) =>
  tokenPath.split(".").some((segment) => segment.toLowerCase() === "figma");

/** Новые самостоятельные коллекции (например, aura/typography) не имеют полей в Aura. */
export const getStandaloneCollectionNames = (tokenExport) =>
  Object.keys(tokenExport).filter(
    (collectionName) =>
      collectionName.startsWith("aura/") &&
      !BUILTIN_COLLECTION_NAMES.includes(collectionName) &&
      !collectionName.startsWith(SEMANTIC_PREFIX) &&
      !collectionName.startsWith(COMPONENT_PREFIX) &&
      !isAppComponentsCollection(collectionName),
  );

/** Разворачиваем вложенный JSON в Map: form.field.padding.y -> определение токена. */
export function indexCollectionTokens(sourceNode, parentPath = "", tokensByPath = new Map()) {
  if (isDesignToken(sourceNode)) tokensByPath.set(parentPath, sourceNode);
  else if (isObject(sourceNode)) {
    for (const [fieldName, childNode] of Object.entries(sourceNode)) {
      const normalizedFieldName = normalizeTokenName(fieldName);
      indexCollectionTokens(
        childNode,
        parentPath ? `${parentPath}.${normalizedFieldName}` : normalizedFieldName,
        tokensByPath,
      );
    }
  }
  return tokensByPath;
}

/** Индексируем все коллекции и отдельно учитываем токены только для Figma. */
export function indexSourceCollections(tokenExport) {
  const indexedCollections = new Map(
    Object.entries(tokenExport)
      .filter(([collectionName]) => collectionName.startsWith("aura/"))
      .map(([collectionName, collectionTokens]) => [collectionName, indexCollectionTokens(collectionTokens)]),
  );
  const ignoredSourceTokens = [];
  for (const [collectionName, tokensByPath] of indexedCollections) {
    for (const [tokenPath, sourceToken] of tokensByPath) {
      if (isFigmaOnlyTokenPath(tokenPath)) {
        ignoredSourceTokens.push({
          collection: collectionName,
          key: tokenPath,
          value: sourceToken.$value,
        });
        tokensByPath.delete(tokenPath);
      }
    }
  }
  return { indexedCollections, ignoredSourceTokens };
}

export function findUnusedSourceTokens(indexedCollections, usedTokenIds) {
  const unusedSourceTokens = [];
  for (const [collectionName, tokensByPath] of indexedCollections) {
    for (const [tokenPath, sourceToken] of tokensByPath) {
      if (!usedTokenIds.has(`${collectionName}/${tokenPath}`)) {
        unusedSourceTokens.push({
          collection: collectionName,
          key: tokenPath,
          value: sourceToken.$value,
        });
      }
    }
  }
  return unusedSourceTokens;
}
