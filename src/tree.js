/** Обход и проверка вложенных деревьев пресета / токенов. */

export const isObject = (value) => value !== null && typeof value === 'object';

export const isDesignToken = (value) =>
  isObject(value) && Object.hasOwn(value, '$value');

/** Создаёт копию дерева, преобразуя только конечные значения. */
export function mapLeafValues(tree, transformLeaf, pathSegments = []) {
  if (!isObject(tree)) return transformLeaf(tree, pathSegments);
  return Object.fromEntries(
    Object.entries(tree).map(([fieldName, fieldValue]) => [
      fieldName,
      mapLeafValues(fieldValue, transformLeaf, [...pathSegments, fieldName]),
    ]),
  );
}

/** Обходит конечные значения без создания новой копии дерева. */
export function forEachLeafValue(tree, visitLeaf, pathSegments = []) {
  if (!isObject(tree)) {
    visitLeaf(tree, pathSegments);
    return;
  }
  for (const [fieldName, fieldValue] of Object.entries(tree)) {
    forEachLeafValue(fieldValue, visitLeaf, [...pathSegments, fieldName]);
  }
}

/** Есть ли такое же поле в исходной Aura? Тогда новое значение можно унаследовать. */
export function hasNestedPath(currentObject, pathSegments) {
  return pathSegments.every((fieldName) => {
    if (!isObject(currentObject) || !Object.hasOwn(currentObject, fieldName))
      return false;
    currentObject = currentObject[fieldName];
    return true;
  });
}
