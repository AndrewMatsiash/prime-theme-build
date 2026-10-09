#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  buildPreset,
  createDiffHistoryRecord,
  diffPresets,
  formatDiffHistory,
  formatPresetDiff,
  isEmptyDiff,
  listDiffHistory,
  parsePresetModule,
  readTokenJson,
  serializePresetModule,
  writeCssVariables,
  writeDiffHistory,
  DEFAULT_DIFF_HISTORY_DIRNAME,
} from '../src/index.js';

function printHelp() {
  console.log(`Usage:
  bxbt-theme-build --config <theme.config.js>
  bxbt-theme-build css-vars --config <theme.config.js>
  bxbt-theme-build report --config <theme.config.js>
  bxbt-theme-build diff --config <theme.config.js>
  bxbt-theme-build diff --history --config <theme.config.js>

Config exports default {
  tokensDir, outDir, pixelsPerRem?,
  reportsDir?, // default: <outDir>/../reports or ./theme/reports via app config
  diffHistoryDir?, // default: <reportsDir>/diff-history; last 3 build diffs
  presets: [{ file, out }],
  cssVariables?: { preset?, out, prefix? }, // prefix default: 'p' → --p-*
  extendTemplate?(template, source),
  aura?, // optional; defaults to @primeuix/themes/aura
}`);
}

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function resolveCommand() {
  const arg = process.argv[2];
  if (arg === 'css-vars' || arg === 'report' || arg === 'diff') return arg;
  return 'build';
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function loadConfig(configPath) {
  const absolutePath = path.resolve(process.cwd(), configPath);
  const module = await import(pathToFileURL(absolutePath).href);
  const config = module.default ?? module;
  if (!config?.tokensDir || !config?.outDir || !Array.isArray(config.presets)) {
    throw new Error(
      'Config must export tokensDir, outDir, and presets: [{ file, out }].',
    );
  }
  return { ...config, configDir: path.dirname(absolutePath) };
}

function resolveAura(config) {
  if (config.aura) return config.aura;
  // Resolve Aura from the app that runs the CLI, not from this package.
  const appRequire = createRequire(path.join(process.cwd(), 'package.json'));
  return appRequire('@primeuix/themes/aura').default;
}

function resolveReportsDir(config) {
  if (config.reportsDir) {
    return path.resolve(config.configDir, config.reportsDir);
  }
  return path.resolve(config.configDir, config.outDir, '../reports');
}

function resolveDiffHistoryDir(config) {
  if (config.diffHistoryDir) {
    return path.resolve(config.configDir, config.diffHistoryDir);
  }
  return path.join(resolveReportsDir(config), DEFAULT_DIFF_HISTORY_DIRNAME);
}

async function readPreviousPreset(outputPath) {
  try {
    return parsePresetModule(await fs.readFile(outputPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeBuildDiffHistory(config, { out, preset, outputPath }) {
  let previous;
  try {
    previous = await readPreviousPreset(outputPath);
  } catch (error) {
    console.error(`Could not diff previous preset ${outputPath}: ${error.message}`);
    return;
  }
  if (!previous) return;
  const diff = diffPresets(previous, preset);
  if (isEmptyDiff(diff)) return;
  const historyPath = await writeDiffHistory(
    resolveDiffHistoryDir(config),
    createDiffHistoryRecord(out, diff),
  );
  console.log(`Diff history: ${historyPath}`);
}

async function forEachPreset(config, visit) {
  const aura = resolveAura(config);
  const tokensDir = path.resolve(config.configDir, config.tokensDir);
  const results = [];
  for (const entry of config.presets) {
    const source = await readTokenJson(path.join(tokensDir, entry.file));
    const built = buildPreset(source, {
      aura,
      pixelsPerRem: config.pixelsPerRem,
      extendTemplate: config.extendTemplate,
    });
    results.push(await visit({ ...entry, source, ...built }));
  }
  return results;
}

async function buildPresets(config) {
  const outDir = path.resolve(config.configDir, config.outDir);
  await fs.mkdir(outDir, { recursive: true });

  return forEachPreset(config, async ({ out, preset, report }) => {
    const outputPath = path.join(outDir, out);
    await writeBuildDiffHistory(config, { out, preset, outputPath });
    await fs.writeFile(outputPath, serializePresetModule(preset), 'utf8');
    console.log(`Prime preset generated: ${outputPath}`);
    console.log(report.summary);
    return { out, preset, report };
  });
}

async function buildReports(config) {
  const reportsDir = resolveReportsDir(config);
  await fs.mkdir(reportsDir, { recursive: true });

  return forEachPreset(config, async ({ out, report }) => {
    const reportName = out.replace(/\.ts$/i, '.report.json');
    const reportPath = path.join(reportsDir, reportName);
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Report: ${reportPath}`);
    console.log(report.summary);
    return { reportPath, report };
  });
}

async function printPendingDiff(config) {
  const outDir = path.resolve(config.configDir, config.outDir);
  await forEachPreset(config, async ({ out, preset }) => {
    const outputPath = path.join(outDir, out);
    const previous = await readPreviousPreset(outputPath);
    if (!previous) {
      console.log(
        `No previous preset at ${outputPath}. Run build once before diff.`,
      );
      return;
    }
    console.log(formatPresetDiff(diffPresets(previous, preset), { heading: out }));
  });
}

async function printDiffHistory(config) {
  const historyDir = resolveDiffHistoryDir(config);
  for (const entry of config.presets) {
    const records = await listDiffHistory(historyDir, entry.out);
    console.log(formatDiffHistory(records, { heading: entry.out }));
  }
}

async function buildCssVariables(config) {
  const cssVariables = config.cssVariables;
  if (!cssVariables?.out) {
    throw new Error('cssVariables.out is required for css-vars command.');
  }
  const outDir = path.resolve(config.configDir, config.outDir);
  await fs.mkdir(outDir, { recursive: true });

  let preset = cssVariables.preset;
  if (!preset) {
    const firstPreset = config.presets[0];
    if (!firstPreset) {
      throw new Error('presets[0] is required when cssVariables.preset is omitted.');
    }
    const aura = resolveAura(config);
    const tokensDir = path.resolve(config.configDir, config.tokensDir);
    const source = await readTokenJson(path.join(tokensDir, firstPreset.file));
    ({ preset } = buildPreset(source, {
      aura,
      pixelsPerRem: config.pixelsPerRem,
      extendTemplate: config.extendTemplate,
    }));
  }

  await writeCssVariables(preset, path.join(outDir, cssVariables.out), {
    prefix: cssVariables.prefix,
  });
}

async function main() {
  const command = resolveCommand();
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }
  const configPath = getArg('--config');
  if (!configPath) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const config = await loadConfig(configPath);
  if (command === 'css-vars') {
    await buildCssVariables(config);
  } else if (command === 'report') {
    await buildReports(config);
  } else if (command === 'diff') {
    if (hasFlag('--history')) await printDiffHistory(config);
    else await printPendingDiff(config);
  } else {
    await buildPresets(config);
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
