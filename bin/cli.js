#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  buildPreset,
  readTokenJson,
  serializePresetModule,
  writeCssVariables,
} from '../src/index.js';

function printHelp() {
  console.log(`Usage:
  bxbt-theme-build --config <theme.config.js>
  bxbt-theme-build css-vars --config <theme.config.js>
  bxbt-theme-build report --config <theme.config.js>

Config exports default {
  tokensDir, outDir, pixelsPerRem?,
  reportsDir?, // default: <outDir>/../reports or ./theme/reports via app config
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
  if (arg === 'css-vars' || arg === 'report') return arg;
  return 'build';
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
