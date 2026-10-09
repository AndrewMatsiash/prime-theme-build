/**
 * Сравнение двух пресетов и история дельт (последние N сборок).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { forEachLeafValue } from './tree.js';

export const DEFAULT_DIFF_HISTORY_KEEP = 3;
export const DEFAULT_DIFF_HISTORY_DIRNAME = 'diff-history';

/** Same shape as the generated `.ts`: JSON.stringify drops `undefined` keys. */
export function toStoredPreset(preset) {
  return JSON.parse(JSON.stringify(preset));
}

export function flattenPreset(preset) {
  const valuesByPath = new Map();
  forEachLeafValue(preset, (value, pathSegments) => {
    if (pathSegments.length === 0 || value === undefined) return;
    valuesByPath.set(pathSegments.join('.'), value);
  });
  return valuesByPath;
}

const sameLeafValue = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const sortByPath = (entries) =>
  [...entries].sort((left, right) => left.path.localeCompare(right.path));

export function isEmptyDiff(diff) {
  return (
    diff.summary.added === 0 &&
    diff.summary.removed === 0 &&
    diff.summary.changed === 0
  );
}

export function diffPresets(previousPreset, nextPreset) {
  const previous = flattenPreset(toStoredPreset(previousPreset));
  const next = flattenPreset(toStoredPreset(nextPreset));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [tokenPath, value] of next) {
    if (!previous.has(tokenPath)) {
      added.push({ path: tokenPath, value });
      continue;
    }
    const from = previous.get(tokenPath);
    if (!sameLeafValue(from, value)) {
      changed.push({ path: tokenPath, from, to: value });
    }
  }

  for (const [tokenPath, value] of previous) {
    if (!next.has(tokenPath)) {
      removed.push({ path: tokenPath, value });
    }
  }

  return {
    added: sortByPath(added),
    removed: sortByPath(removed),
    changed: sortByPath(changed),
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
    },
  };
}

const formatDiffValue = (value) =>
  typeof value === 'string' ? value : JSON.stringify(value);

export function formatPresetDiff(diff, { heading } = {}) {
  const lines = [];
  if (heading) lines.push(heading);
  if (isEmptyDiff(diff)) {
    lines.push('No preset changes.');
    return lines.join('\n');
  }
  for (const { path: tokenPath, value } of diff.added) {
    lines.push(`+ ${tokenPath}  ${formatDiffValue(value)}`);
  }
  for (const { path: tokenPath, value } of diff.removed) {
    lines.push(`- ${tokenPath}  ${formatDiffValue(value)}`);
  }
  for (const { path: tokenPath, from, to } of diff.changed) {
    lines.push(
      `~ ${tokenPath}  ${formatDiffValue(from)} → ${formatDiffValue(to)}`,
    );
  }
  lines.push(
    `${diff.summary.added} added, ${diff.summary.removed} removed, ${diff.summary.changed} changed`,
  );
  return lines.join('\n');
}

export function historySlugFromOut(outFile) {
  return path
    .basename(outFile, path.extname(outFile))
    .replace(/[^\w.-]+/g, '-');
}

const historyFileSuffix = (slug) => `.${slug}.json`;

const stampFromIso = (iso) => iso.replaceAll(':', '-').replaceAll('.', '-');

export async function listDiffHistoryFiles(historyDir, slug) {
  let names;
  try {
    names = await fs.readdir(historyDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const suffix = historyFileSuffix(slug);
  return names
    .filter((name) => name.endsWith(suffix))
    .sort()
    .reverse()
    .map((name) => path.join(historyDir, name));
}

export async function listDiffHistory(historyDir, outFile) {
  const slug = historySlugFromOut(outFile);
  const files = await listDiffHistoryFiles(historyDir, slug);
  const records = [];
  for (const filePath of files) {
    records.push(JSON.parse(await fs.readFile(filePath, 'utf8')));
  }
  return records;
}

export function formatDiffHistory(records, { heading } = {}) {
  if (records.length === 0) {
    return heading
      ? `${heading}\nNo diff history yet.`
      : 'No diff history yet.';
  }
  return records
    .map((record, index) => {
      const diff = {
        added: record.added ?? [],
        removed: record.removed ?? [],
        changed: record.changed ?? [],
        summary: record.summary ?? {
          added: record.added?.length ?? 0,
          removed: record.removed?.length ?? 0,
          changed: record.changed?.length ?? 0,
        },
      };
      const title = `--- ${record.at}  ${record.out}  (+${diff.summary.added} ~${diff.summary.changed} -${diff.summary.removed})`;
      const body = formatPresetDiff(diff);
      return index === 0 && heading
        ? `${heading}\n${title}\n${body}`
        : `${title}\n${body}`;
    })
    .join('\n\n');
}

export async function writeDiffHistory(
  historyDir,
  record,
  { keep = DEFAULT_DIFF_HISTORY_KEEP } = {},
) {
  const slug = historySlugFromOut(record.out);
  await fs.mkdir(historyDir, { recursive: true });
  const filePath = path.join(
    historyDir,
    `${stampFromIso(record.at)}.${slug}.json`,
  );
  await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  const files = await listDiffHistoryFiles(historyDir, slug);
  await Promise.all(files.slice(keep).map((oldPath) => fs.unlink(oldPath)));
  return filePath;
}

export function createDiffHistoryRecord(outFile, diff, at = new Date().toISOString()) {
  return {
    at,
    out: outFile,
    summary: diff.summary,
    added: diff.added,
    removed: diff.removed,
    changed: diff.changed,
  };
}
