# @metbox/wmbus

TypeScript implementation of the wireless M-Bus (wM-Bus) protocol and meter
drivers. Decodes wM-Bus hex telegrams — from Kamstrup, Diehl, Techem, Apator,
Itron, Qundis, and ~80 other manufacturers — into typed JSON.

**Status: pre-alpha.** See `/Users/martins_metbox/.claude/plans/jazzy-hopping-spindle.md`
for the phased implementation plan. Phases 1–7 are landing incrementally before
the public API becomes usable.

## Goals

- Replace the existing Emscripten-built wmbusmeters WASM with pure TypeScript.
- Zero native/WASM dependencies, zero runtime npm dependencies.
- Declarative driver definitions — add new meters without C++ rebuilds.
- Full parity with the 91 meter drivers currently referenced by Metbox's
  device-model seed data.

## Public API

```ts
import { decodeWmbusHex, listWmbusDrivers, analyzeWmbusHex } from "@metbox/wmbus";

const decoded = await decodeWmbusHex(
  "2644EC210277260341377287050901EC210003D6831025311EB32B1AAD42B153DD208D11D61D37",
  "auto",
  "5241A18CE86B309A0033FB233F80F64B",
);
// => { _: "telegram", media: "heat", meter: "sharky", id: "...", total_energy_consumption_kwh: ..., ... }
```

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
