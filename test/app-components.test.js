import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { definePreset, ThemeUtils } from '@primeuix/themes';

import {
  buildPreset,
  collectCssVariables,
  readTokenJson,
} from '../src/index.js';
import { addMissingFigmaTemplateFields } from '../src/template-missing.js';
import { describePresetField } from '../src/paths.js';

const require = createRequire(import.meta.url);
const Aura = require('@primeuix/themes/aura').default;

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/design-tokens.json',
);

test('describePresetField peels extend.colorScheme mode', () => {
  assert.deepEqual(
    describePresetField([
      'extend',
      'colorScheme',
      'dark',
      'modalicon',
      'danger',
      'background',
    ]),
    {
      section: 'extend',
      mode: 'dark',
      key: 'modalicon.danger.background',
    },
  );
});

test('app-components light/dark go under extend.colorScheme', () => {
  const presetTemplate = {
    semantic: { colorScheme: { light: {}, dark: {} } },
    components: {},
    extend: {},
  };
  addMissingFigmaTemplateFields(presetTemplate, {
    'aura/app-components-color-scheme/light': {
      modalicon: {
        danger: { background: { $value: '{red.100}' } },
      },
    },
    'aura/app-components-color-scheme/dark': {
      modalicon: {
        danger: { background: { $value: '{red.950}' } },
      },
    },
  });

  assert.ok(
    Object.hasOwn(
      presetTemplate.extend.colorScheme.light.modalicon.danger,
      'background',
    ),
  );
  assert.ok(
    Object.hasOwn(
      presetTemplate.extend.colorScheme.dark.modalicon.danger,
      'background',
    ),
  );
  assert.equal(presetTemplate.extend.modalicon, undefined);
});

test('app-components modalicon builds light/dark CSS variables', async () => {
  const source = await readTokenJson(fixturePath);
  const { preset, report } = buildPreset(source, { aura: Aura });

  assert.equal(
    preset.extend.colorScheme.light.modalicon.danger.background,
    '{red.100}',
  );
  assert.equal(
    preset.extend.colorScheme.dark.modalicon.danger.background,
    '{red.950}',
  );

  assert.deepEqual(
    report.unusedSourceTokens.filter((entry) =>
      String(entry.collection).includes('app-components'),
    ),
    [],
  );

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
  assert.match(global.css, /--p-modalicon-danger-background:var\(--p-red-100\)/);
  assert.match(
    global.css,
    /\.dark[\s\S]*--p-modalicon-danger-background:var\(--p-red-950\)/,
  );
  assert.equal(
    collectCssVariables(preset).get('--p-modalicon-danger-background'),
    'var(--p-red-100)',
  );
});

test('invalid #NaN token values fail the build', async () => {
  const source = await readTokenJson(fixturePath);
  source['aura/app-components-color-scheme/dark'].modalicon.danger.background = {
    $type: 'color',
    $value: '#NaNNaNNaN',
  };
  assert.throws(
    () => buildPreset(source, { aura: Aura }),
    /Некорректные значения токенов/,
  );
});
