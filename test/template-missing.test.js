import assert from 'node:assert/strict';
import test from 'node:test';

import { addMissingFigmaTemplateFields } from '../src/template-missing.js';

const emptySemanticTemplate = () => ({
  semantic: {
    colorScheme: {
      light: { content: { background: undefined } },
      dark: { content: { background: undefined } },
    },
    form: { field: { background: undefined } },
  },
  components: {},
});

test('semantic common missing keys stay on the semantic root', () => {
  const presetTemplate = emptySemanticTemplate();
  addMissingFigmaTemplateFields(presetTemplate, {
    'aura/semantic/common': {
      overlay: {
        title: { font: { size: { $value: '{scale.1-5}' } } },
      },
    },
    'aura/semantic/light': {},
    'aura/semantic/dark': {},
  });

  assert.equal(
    Object.hasOwn(presetTemplate.semantic.overlay.title, 'fontSize'),
    true,
  );
  assert.equal(
    presetTemplate.semantic.colorScheme.light.overlay?.title,
    undefined,
  );
});

test('semantic light/dark missing keys go under colorScheme', () => {
  const presetTemplate = emptySemanticTemplate();
  addMissingFigmaTemplateFields(presetTemplate, {
    'aura/semantic/common': {},
    'aura/semantic/light': {
      navigation: {
        workspacecard: { background: { $value: '{surface.50}' } },
      },
    },
    'aura/semantic/dark': {
      navigation: {
        workspacecard: { background: { $value: '{surface.800}' } },
      },
    },
  });

  assert.equal(
    Object.hasOwn(
      presetTemplate.semantic.colorScheme.light.navigation.workspacecard,
      'background',
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      presetTemplate.semantic.colorScheme.dark.navigation.workspacecard,
      'background',
    ),
    true,
  );
  assert.equal(presetTemplate.semantic.navigation?.workspacecard, undefined);
});
