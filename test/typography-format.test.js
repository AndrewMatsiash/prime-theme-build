import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatPixels,
  formatNumberToken,
  sanitizeTokenNumber,
} from '../src/format-values.js';
import {
  formatTypographyNumber,
  typographyPropertyFromPath,
} from '../src/typography-format.js';

test('typographyPropertyFromPath resolves nested roles', () => {
  assert.equal(
    typographyPropertyFromPath('title.h1.font-weight.bold'),
    'font-weight',
  );
  assert.equal(typographyPropertyFromPath('title.h1.line-height'), 'line-height');
  assert.equal(typographyPropertyFromPath('text.body.font-size'), 'font-size');
  assert.equal(typographyPropertyFromPath('font.family.base'), 'font-family');
});

test('aura/typography uses property table, not generic px for weight', () => {
  const sourceToken = {
    collectionName: 'aura/typography',
    tokenPath: 'title.h1.font-weight.bold',
  };
  assert.equal(
    formatTypographyNumber(700, sourceToken, {
      formatPixels,
      sanitizeTokenNumber,
    }),
    '700',
  );
  assert.equal(formatNumberToken(700, sourceToken, 14), '700');
});

test('aura/typography line-height is px from absolute Figma values', () => {
  const sourceToken = {
    collectionName: 'aura/typography',
    tokenPath: 'title.h1.line-height',
  };
  assert.equal(
    formatNumberToken(29.399999618530273, sourceToken, 14),
    '29.4px',
  );
});

test('opacity over 1 is percent, 0–1 stays as-is', () => {
  const sourceToken = {
    collectionName: 'aura/semantic/common',
    tokenPath: 'disabled.opacity',
  };
  assert.equal(formatNumberToken(60, sourceToken, 14), '0.6');
  assert.equal(formatNumberToken(0.6, sourceToken, 14), '0.6');
  assert.equal(formatNumberToken(1, sourceToken, 14), '1');
  assert.equal(formatNumberToken(0, sourceToken, 14), '0');
});

test('non-typography collections ignore typography table', () => {
  assert.equal(
    formatTypographyNumber(
      700,
      { collectionName: 'aura/primitive', tokenPath: 'weight.700' },
      { formatPixels, sanitizeTokenNumber },
    ),
    undefined,
  );
});
