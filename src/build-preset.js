/**
 * Оркестратор сборки пресета из экспорта primeui-figma-plugin-v4.
 *
 * 1. createPresetTemplate — форма полей из Aura + пути из JSON
 * 2. buildPresetFromTokens — значения, ссылки, отчёт
 * Дополнительные коллекции попадают в extend и создают CSS-переменные.
 */

import fs from 'node:fs/promises';

import { DEFAULT_PIXELS_PER_REM, buildPresetFromTokens } from './resolve.js';
import { createPresetTemplate } from './template.js';

export { createPresetTemplate } from './template.js';
export { buildPresetFromTokens } from './resolve.js';

export const serializePresetModule = (preset) =>
  `const preset = ${JSON.stringify(preset, null, 2)} as unknown as Parameters<
  typeof import('@primeuix/themes').definePreset
>[0];

export default preset;
`;

export const readTokenJson = async (filePath) =>
  JSON.parse((await fs.readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));

export function buildPreset(
  tokenExport,
  { aura, pixelsPerRem = DEFAULT_PIXELS_PER_REM, extendTemplate } = {},
) {
  if (!aura) {
    throw new Error('buildPreset: option "aura" is required.');
  }
  const presetTemplate = createPresetTemplate(aura, tokenExport, {
    extendTemplate,
  });
  return buildPresetFromTokens(tokenExport, presetTemplate, aura, {
    pixelsPerRem,
  });
}
