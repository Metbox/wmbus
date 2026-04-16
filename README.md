# @metbox/wmbus

[![Release](https://img.shields.io/github/v/release/Metbox/wmbus?sort=semver)](https://github.com/Metbox/wmbus/releases)
[![CI](https://github.com/Metbox/wmbus/actions/workflows/ci.yml/badge.svg)](https://github.com/Metbox/wmbus/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

TypeScript implementation of the wireless M-Bus (wM-Bus) protocol and meter
drivers. Decodes wM-Bus hex telegrams — from Kamstrup, Diehl, Techem, Apator,
Itron, Qundis, and ~80 other manufacturers — into typed JSON.

A pure-TypeScript replacement for the Emscripten-compiled WASM build of
[wmbusmeters](https://github.com/wmbusmeters/wmbusmeters): zero native deps,
zero runtime npm deps, ESM-only, Node 20+.

**Driver coverage:** 71 / 116 seed drivers at 100% upstream fixture parity
(239 / 422 fixtures byte-for-byte). See [TODO.md](./TODO.md) for the path to
full parity.

## Install

Installed directly from GitHub, pinned to a release tag — no npm registry.

```bash
# pin to a specific release (recommended)
npm install github:Metbox/wmbus#v0.1.0

# or, from the latest develop commit
npm install github:Metbox/wmbus
```

Or in `package.json`:

```jsonc
{
  "dependencies": {
    "@metbox/wmbus": "github:Metbox/wmbus#v0.1.0"
  }
}
```

`npm install` clones the repo, installs devDeps, runs the `prepare`
script (which builds `dist/`), packs the build, and installs it into
your `node_modules` — no registry, no auth required for public installs.

## Public API

```ts
import { decodeWmbusHex, listWmbusDrivers, analyzeWmbusHex } from "@metbox/wmbus";

const decoded = await decodeWmbusHex(
  "2644EC210277260341377287050901EC210003D6831025311EB32B1AAD42B153DD208D11D61D37",
  "auto",
  "5241A18CE86B309A0033FB233F80F64B",
);
// => { _: "telegram", media: "heat", meter: "sharky", id: "...", total_energy_consumption_kwh: ..., ... }

const drivers = await listWmbusDrivers();
// => ["abbb23", "aerius", "amiplus", ..., "auto"]

const { json, raw, stderr } = await analyzeWmbusHex(hex, "auto", key);
// json: parsed object, raw: pretty-printed JSON, stderr: error message if any
```

The three functions are signature-compatible with the WASM wrapper they
replace. `decodeWmbusHex` is `async` for source compatibility even though the
implementation is synchronous.

## Custom drivers

```ts
import { registerCustomDriver } from "@metbox/wmbus";

registerCustomDriver({
  name: "my-custom-meter",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: 0x0DFE, version: 0x04, type: 0x40 }],
  fields: [/* see drivers/types.ts */],
});
```

## License

GPL-3.0-or-later. Derived from [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters)
by Fredrik Öhrström and contributors. Protocol knowledge and driver structure
inherit from the upstream C++ implementation pinned at commit `af48083`; see
`vendor/wmbusmeters@af48083/` for the reference source.

## Development

```bash
npm install
npm run harvest    # extract ~550 golden test fixtures from vendor/
npm test           # run vitest
npm run typecheck  # strict TS check
npm run check      # biome lint + format
```

## Attribution

This package is a clean-room reimplementation in TypeScript guided by the
upstream wmbusmeters source, its test fixtures, and the EN 13757 family of
standards. Driver field-extraction semantics mirror upstream behaviour so
existing wM-Bus keys and decoder configurations continue to work.
