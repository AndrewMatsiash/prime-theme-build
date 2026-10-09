import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parsePresetModule,
  serializePresetModule,
} from '../src/build-preset.js';
import {
  DEFAULT_DIFF_HISTORY_KEEP,
  createDiffHistoryRecord,
  diffPresets,
  flattenPreset,
  formatDiffHistory,
  formatPresetDiff,
  isEmptyDiff,
  listDiffHistory,
  writeDiffHistory,
} from '../src/preset-diff.js';

test('flattenPreset walks leaf paths', () => {
  const flat = flattenPreset({
    semantic: { overlay: { title: { fontSize: '{scale.1-5}' } } },
    components: { drawer: { root: { borderRadius: '8px' } } },
  });
  assert.equal(flat.get('semantic.overlay.title.fontSize'), '{scale.1-5}');
  assert.equal(flat.get('components.drawer.root.borderRadius'), '8px');
});

test('diffPresets reports added, removed and changed paths', () => {
  const previous = {
    semantic: {
      overlay: { title: { fontSize: '{scale.1-5}' } },
      extra: 'gone',
    },
  };
  const next = {
    semantic: {
      overlay: { title: { fontSize: '{scale.1-25}' } },
      form: { field: { background: '{surface.0}' } },
    },
  };
  const diff = diffPresets(previous, next);
  assert.deepEqual(diff.added, [
    { path: 'semantic.form.field.background', value: '{surface.0}' },
  ]);
  assert.deepEqual(diff.removed, [{ path: 'semantic.extra', value: 'gone' }]);
  assert.deepEqual(diff.changed, [
    {
      path: 'semantic.overlay.title.fontSize',
      from: '{scale.1-5}',
      to: '{scale.1-25}',
    },
  ]);
  assert.equal(isEmptyDiff(diff), false);
});

test('diffPresets ignores undefined keys dropped by JSON.stringify', () => {
  const inMemory = {
    semantic: {
      color: '{surface.0}',
      placeholder: undefined,
      nested: { missing: undefined },
    },
  };
  const onDisk = parsePresetModule(serializePresetModule(inMemory));
  assert.equal(isEmptyDiff(diffPresets(onDisk, inMemory)), true);
});

test('diffPresets is empty when presets match', () => {
  const preset = { semantic: { color: '{surface.0}' } };
  const diff = diffPresets(preset, structuredClone(preset));
  assert.equal(isEmptyDiff(diff), true);
  assert.match(formatPresetDiff(diff), /No preset changes/);
});

test('formatPresetDiff prints + - ~ lines', () => {
  const text = formatPresetDiff(
    diffPresets(
      { a: '1', gone: 'x' },
      { a: '2', extra: '{surface.0}' },
    ),
    { heading: 'prime-preset.ts' },
  );
  assert.match(text, /^prime-preset\.ts/m);
  assert.match(text, /^\+ extra {2}\{surface\.0\}/m);
  assert.match(text, /^- gone {2}x/m);
  assert.match(text, /^~ a {2}1 → 2/m);
  assert.match(text, /1 added, 1 removed, 1 changed/);
});

test('parsePresetModule round-trips serializePresetModule', () => {
  const preset = {
    semantic: { overlay: { title: { fontSize: '{scale.1-5}' } } },
  };
  assert.deepEqual(parsePresetModule(serializePresetModule(preset)), preset);
});

test('writeDiffHistory keeps only the last three files per out', async () => {
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bxbt-diff-'));
  try {
    const out = 'prime-preset.ts';
    for (let index = 1; index <= 4; index += 1) {
      const diff = diffPresets({ color: String(index) }, { color: String(index + 1) });
      await writeDiffHistory(
        historyDir,
        createDiffHistoryRecord(out, diff, `2026-10-0${index}T12:00:00.000Z`),
      );
    }
    const records = await listDiffHistory(historyDir, out);
    assert.equal(records.length, DEFAULT_DIFF_HISTORY_KEEP);
    assert.deepEqual(
      records.map((record) => record.at),
      [
        '2026-10-04T12:00:00.000Z',
        '2026-10-03T12:00:00.000Z',
        '2026-10-02T12:00:00.000Z',
      ],
    );
    assert.equal(records[0].changed[0].to, '5');
    assert.match(
      formatDiffHistory(records, { heading: 'history' }),
      /2026-10-04T12:00:00.000Z/,
    );
  } finally {
    await fs.rm(historyDir, { recursive: true, force: true });
  }
});
