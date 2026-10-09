import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

import { definePreset, ThemeUtils } from '@primeuix/themes';

const require = createRequire(import.meta.url);
const Aura = require('@primeuix/themes/aura').default;

const PIXELS_PER_REM = 14;
const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g;

export const DEFAULT_CSS_VARIABLE_PREFIX = 'p';

const defaultThemeOptions = (prefix) => ({
  prefix,
  darkModeSelector: '.dark',
  cssLayer: false,
  transform: 'default',
});

// В одном CSS-блоке Prime сначала пишет light, потом dark. Для подсказок редактора
// оставляем светлое значение. Следующий блок того же пресета может переопределить его.
function readDeclarations(css, variables, { override }) {
  if (!css) return;
  const seenInBlock = new Set();
  for (const match of css.matchAll(DECLARATION)) {
    const name = match[1];
    if (seenInBlock.has(name)) continue;
    seenInBlock.add(name);
    if (override || !variables.has(name)) {
      variables.set(name, match[2].trim());
    }
  }
}

/**
 * @param {object} preset — overrides из buildPreset
 * @param {{ prefix?: string }} [options]
 */
export function collectCssVariables(
  preset,
  { prefix = DEFAULT_CSS_VARIABLE_PREFIX } = {},
) {
  const theme = definePreset(Aura, preset);
  const themeContext = {
    preset: theme,
    options: defaultThemeOptions(prefix),
  };
  const common = ThemeUtils.getCommon({ theme: themeContext });
  const variables = new Map();

  for (const section of ['primitive', 'semantic', 'global']) {
    readDeclarations(common[section]?.css, variables, { override: true });
  }

  for (const name of Object.keys(theme.components ?? {}).sort()) {
    const component = ThemeUtils.getPresetC({ name, theme: themeContext });
    readDeclarations(component?.css, variables, { override: true });
  }

  return variables;
}

const formatRemVariable = (name, value) => {
  const match = /^(-?\d+(?:\.\d+)?)rem$/.exec(value);
  if (!match) return null;
  const px = Number((Number(match[1]) * PIXELS_PER_REM).toFixed(2));
  return `  ${name}: ${value}; /* ${px}px */`;
};

export function formatCssVariableSheet(variables) {
  const lines = [...variables.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([name, value]) =>
        formatRemVariable(name, value) ?? `  ${name}: ${value};`,
    );

  return `:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * @param {object} preset
 * @param {string} outputPath
 * @param {{ prefix?: string }} [options]
 */
export async function writeCssVariables(
  preset,
  outputPath,
  { prefix = DEFAULT_CSS_VARIABLE_PREFIX } = {},
) {
  const variables = collectCssVariables(preset, { prefix });
  await fs.writeFile(outputPath, formatCssVariableSheet(variables), 'utf8');
  console.log(`CSS variables generated: ${outputPath}`);
  console.log(`Variables: ${variables.size} (prefix: --${prefix}-)`);
  return variables.size;
}
