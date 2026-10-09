# bxbt-theme-build

Builds UI theme presets from `primeui-figma-plugin-v4` token JSON exports.

How modules fit together: see [ARCHITECTURE.md](./ARCHITECTURE.md).  
For designers (what to add / avoid in Figma): [DESIGNER-GUIDE.md](./DESIGNER-GUIDE.md).  
Engineering token rules: [VARIABLE-RULES.md](./VARIABLE-RULES.md).

Token JSON is validated with [Zod](https://zod.dev) (`source` + required `aura/*` collections) before build.

## Install

```bash
npm i -D bxbt-theme-build
# peer:
npm i @primeuix/themes
```

Local path (during development):

```json
"devDependencies": {
  "bxbt-theme-build": "file:../prime-theme-build"
}
```

## CLI

```bash
bxbt-theme-build --config theme.config.js
bxbt-theme-build css-vars --config theme.config.js
bxbt-theme-build report --config theme.config.js
bxbt-theme-build diff --config theme.config.js
bxbt-theme-build diff --history --config theme.config.js
```

`diff` compares the new token JSON (in memory) with the current `outDir` preset and does not overwrite files. Run it **after** replacing the Figma export and **before** `build`.

`build` writes a delta into `{reportsDir}/diff-history/` (last 3 generations per `out` file). `diff --history` prints those files.

### `theme.config.js`

```js
export default {
  tokensDir: './theme/tokens',
  outDir: './theme/generated',
  reportsDir: './theme/reports',
  // diffHistoryDir: './theme/reports/diff-history', // default; last 3 build diffs
  pixelsPerRem: 14,
  presets: [
    { file: 'design-tokens.json', out: 'prime-preset.ts' },
  ],
  cssVariables: {
    out: '_primevue-theme.variables.scss',
    prefix: 'p', // → --p-*; must match theme options in the app
  },
  extendTemplate(template) {
    // App-specific fields missing from Aura
  },
};
```

## API

```js
import { buildPreset, writeCssVariables } from 'bxbt-theme-build';
import Aura from '@primeuix/themes/aura';

const { preset, report } = buildPreset(tokenExport, {
  aura: Aura,
  pixelsPerRem: 14,
  extendTemplate(template) {},
});

await writeCssVariables(preset, './theme.variables.scss', { prefix: 'p' });
```
