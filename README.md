# bxbt-theme-build

Dev-tool: JSON from the PrimeUI Figma plugin → PrimeVue / PrimeUIX preset (`.ts`) and optional `--p-*` CSS variables.

It does **not** run in the browser. The app imports the generated files. Aura comes from the app (`@primeuix/themes` peer).

## Daily flow

1. Designers export plugin JSON.
2. Replace the old file in `tokensDir`.
3. `diff` — what would change vs the current generated preset (does not write).
4. `build` — write the new `.ts` and store the delta (last 3) in `reportsDir/diff-history/`.
5. `css-vars` — only if the app also needs a SCSS/CSS variable sheet.

## Install

```bash
npm i -D bxbt-theme-build
npm i @primeuix/themes
```

Local path while developing the builder:

```json
"devDependencies": {
  "bxbt-theme-build": "file:../prime-theme-build"
}
```

## CLI

All commands need `--config theme.config.js`.

| Command | Writes files? | What it is for |
|---------|---------------|----------------|
| `bxbt-theme-build --config …` | yes: `outDir/*.ts` | **build** — generate the preset the app imports |
| `diff --config …` | no | compare new JSON with the current `.ts` (`+` added, `-` removed, `~` changed) |
| `diff --history --config …` | no | print the last 3 build deltas |
| `css-vars --config …` | yes: `cssVariables.out` | CSS/SCSS sheet of `--{prefix}-*` (default `--p-*`) |
| `report --config …` | yes: `reportsDir/*.report.json` | build diagnostics (unused tokens, inherited Aura fields) — not a value diff |

```bash
bxbt-theme-build diff --config theme.config.js
bxbt-theme-build --config theme.config.js
bxbt-theme-build css-vars --config theme.config.js
```

First `build` in an empty `outDir` has nothing to compare: no diff, no history file.

## `theme.config.js`

| Field | For |
|-------|-----|
| `tokensDir` | folder with Figma JSON exports |
| `outDir` | generated preset `.ts` (imported by the app) |
| `reportsDir` | `report` JSON and, by default, diff history |
| `diffHistoryDir` | override history folder (default `{reportsDir}/diff-history`) |
| `presets` | `file` in `tokensDir` → `out` in `outDir` |
| `pixelsPerRem` | Figma `scale.*` → `rem` |
| `cssVariables.out` | generated variable sheet filename |
| `cssVariables.prefix` | CSS prefix (`p` → `--p-*`). Must be the same prefix the app uses when attaching the theme |
| `extendTemplate` | extra preset slots the app needs that Aura does not have |
| `aura` | optional; otherwise Aura is loaded from the **app** `node_modules` |

```js
export default {
  tokensDir: './theme/tokens',
  outDir: './theme/generated',
  reportsDir: './theme/reports',
  pixelsPerRem: 14,
  presets: [
    { file: 'design-tokens.json', out: 'prime-preset.ts' },
  ],
  cssVariables: {
    out: '_primevue-theme.variables.scss',
    prefix: 'p', // must match the prefix used when attaching the theme in the app

  },
};
```

## API

If you do not want the CLI, call the same two steps from a Node script.

- `buildPreset(tokenExport, { aura, pixelsPerRem, extendTemplate })` — like CLI **build**: JSON object in, `{ preset, report }` out. `aura` is required here (pass Aura from `@primeuix/themes/aura`).
- `writeCssVariables(preset, file, { prefix })` — like CLI **css-vars**: write `--{prefix}-*` to a file. `prefix` must match the prefix used when attaching the theme in the app.

The app still imports the generated `.ts` / CSS, not this package.

```js
import { buildPreset, writeCssVariables } from 'bxbt-theme-build';
import Aura from '@primeuix/themes/aura';

const { preset, report } = buildPreset(tokenExport, {
  aura: Aura,
  pixelsPerRem: 14,
});

await writeCssVariables(preset, './theme.variables.scss', { prefix: 'p' });
```
