import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { definePreset, ThemeUtils } from '@primeuix/themes';

import {
  buildPreset,
  collectCssVariables,
  parseTokenExport,
  readTokenJson,
} from '../src/index.js';

const require = createRequire(import.meta.url);
const Aura = require('@primeuix/themes/aura').default;

const fixturesDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

async function buildFromFile(fileName) {
  const source = await readTokenJson(path.join(fixturesDirectory, fileName));
  return { source, ...buildPreset(source, { aura: Aura }) };
}

test('zod rejects exports that are not primeui-figma-plugin-v4', () => {
  assert.throws(
    () => parseTokenExport({ source: 'other' }),
    /Некорректный экспорт токенов/,
  );
});

test('zod accepts the fixture export', async () => {
  const source = await readTokenJson(
    path.join(fixturesDirectory, 'design-tokens.json'),
  );
  const parsed = parseTokenExport(source);
  assert.equal(parsed.source, 'primeui-figma-plugin-v4');
  assert.ok(parsed['aura/primitive']);
});

test('Tabs use the JSON border thickness only on the bottom, as Aura does', async () => {
  const { source, preset } = await buildFromFile('design-tokens.json');

  for (const part of ['tab', 'tablist']) {
    const thickness =
      source['aura/component/common'].tabs[part].border.width.$value;
    assert.equal(
      preset.components.tabs[part].borderWidth,
      `0 0 ${thickness}px 0`,
      `tabs.${part}.borderWidth`,
    );
  }
});

test('standalone token collections are available as CSS variables', async () => {
  const { preset } = await buildFromFile('design-tokens.json');
  const theme = definePreset(Aura, preset);
  const { global } = ThemeUtils.getCommon({
    theme: {
      preset: theme,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark',
        cssLayer: false,
        transform: 'default',
      },
    },
  });

  assert.match(global.css, /--p-font-family-base:Inter;/);
  assert.match(global.css, /--p-title-h1-font-weight-bold:700;/);
  assert.match(global.css, /--p-text-body-font-size:var\(--p-scale-1\);/);
});

test('font weight aliases stay unitless', async () => {
  const { preset } = await buildFromFile('design-tokens.json');
  assert.equal(preset.extend.title.h1['font-weight'].bold, '700');
  assert.equal(preset.extend.title.h1['font-weight'].semibold, '600');
  assert.equal(preset.extend.title.h1['font-weight'].medium, '500');
});

test('standalone line-height floats are sanitized to pixels', async () => {
  const { preset } = await buildFromFile('design-tokens.json');
  assert.equal(preset.extend.title.h1['line-height'], '29.4px');
  assert.equal(preset.extend.title.h2['line-height'], '25.2px');
  assert.equal(preset.extend.text.body['line-height'], '19.6px');
});

test('fields missing from Aura are added from Figma automatically', async () => {
  const { preset } = await buildFromFile('design-tokens.json');

  assert.equal(
    preset.components.drawer.root.borderRadius,
    '{overlay.modal.border.radius}',
  );
  assert.equal(
    preset.semantic.navigation.sidebar.padding,
    '{scale.1-75} {scale.1-143}',
  );
  assert.equal(
    preset.extend.colorScheme.light.modalicon.danger.background,
    '{red.100}',
  );
  assert.equal(
    preset.semantic.colorScheme.light.navigation.workspacecard.background,
    '{surface.50}',
  );
  assert.equal(
    preset.semantic.navigation?.workspacecard,
    undefined,
  );
  assert.equal(
    preset.components.menu.sidebar.padding,
    '{scale.1-75} {scale.1-143}',
  );
});

test('the CSS variable sheet lists prime preset tokens', async () => {
  const { preset } = await buildFromFile('design-tokens.json');
  const variables = collectCssVariables(preset);

  assert.equal(variables.get('--p-font-family-base'), 'Inter');
  assert.equal(variables.get('--p-title-h1-font-weight-bold'), '700');
  assert.equal(variables.get('--p-title-h1-font-weight-semibold'), '600');
  assert.equal(
    variables.get('--p-drawer-border-radius'),
    'var(--p-overlay-modal-border-radius)',
  );
  assert.equal(variables.get('--p-text-color'), 'var(--p-surface-700)');
  assert.equal(variables.has('--p-brand-primary'), false);
});

test('collectCssVariables respects a custom prefix', async () => {
  const { preset } = await buildFromFile('design-tokens.json');
  const variables = collectCssVariables(preset, { prefix: 'bix' });

  assert.equal(variables.get('--bix-font-family-base'), 'Inter');
  assert.equal(variables.has('--p-font-family-base'), false);
});
