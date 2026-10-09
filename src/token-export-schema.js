/**
 * Zod-схемы входа: экспорт плагина + минимальная форма шаблона Aura.
 * Глубину токенов не валидируем — только контракт коллекций.
 */

import { z } from 'zod';

import { PLUGIN_COLLECTIONS, REQUIRED_COLLECTIONS } from './plugin-collections.js';

/** Вложенное дерево коллекции (токены / группы). */
const collectionTreeSchema = z.record(z.string(), z.unknown());

const requiredCollectionFields = Object.fromEntries(
  REQUIRED_COLLECTIONS.map((name) => [name, collectionTreeSchema]),
);

/**
 * Экспорт primeui-figma-plugin-v4.
 * looseObject — app/custom/effects/typography и прочие коллекции допустимы
 * (в Zod 4 вместо устаревшего .passthrough()).
 */
export const tokenExportSchema = z.looseObject({
  source: z.literal('primeui-figma-plugin-v4'),
  ...requiredCollectionFields,
});

/** Минимальные секции шаблона пресета (обычно клон Aura). */
export const presetTemplateSchema = z.looseObject({
  primitive: collectionTreeSchema,
  semantic: collectionTreeSchema,
  components: collectionTreeSchema,
});

function formatZodError(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('\n');
}

/** @throws {Error} с перечнем проблем zod */
export function parseTokenExport(tokenExport) {
  const result = tokenExportSchema.safeParse(tokenExport);
  if (!result.success) {
    throw new Error(
      `Некорректный экспорт токенов:\n${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

/** @throws {Error} */
export function parsePresetTemplate(presetTemplate) {
  const result = presetTemplateSchema.safeParse(presetTemplate);
  if (!result.success) {
    throw new Error(
      `Некорректный шаблон пресета:\n${formatZodError(result.error)}`,
    );
  }
  return result.data;
}
