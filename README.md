# @metbox/wmbus

[![npm](https://img.shields.io/npm/v/@metbox/wmbus.svg)](https://www.npmjs.com/package/@metbox/wmbus)
[![CI](https://github.com/Metbox/wmbus/actions/workflows/ci.yml/badge.svg)](https://github.com/Metbox/wmbus/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

TypeScript implementation of the wireless M-Bus (wM-Bus) protocol and meter
drivers. Decodes wM-Bus hex telegrams — from Kamstrup, Diehl, Techem, Apator,
Itron, Qundis, and ~80 other manufacturers — into typed JSON.

A pure-TypeScript replacement for the Emscripten-compiled WASM build of
[wmbusmeters](https://github.com/wmbusmeters/wmbusmeters): zero native deps,
zero runtime npm deps, ESM-only, Node 20+.

**Driver coverage:** 76 / 116 seed drivers at 100% upstream fixture parity
(286 / 432 fixtures byte-for-byte). See [TODO.md](./TODO.md) for the path to
full parity.

## Install

```bash
npm install @metbox/wmbus
```

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
replace. `decodeWmbusHex` is `async` for source compatibility and because the
`@<name>` path below may reach the network on first use.

## Dynamic drivers via `@<name>`

Prefixing the driver name with `@` downloads the matching `<name>.xmq`
definition from `https://wmbusmeters.org/drivers/` on first use, parses it,
and registers it with the in-memory driver registry. Subsequent calls resolve
straight from the registry — no further network traffic.

```ts
// Downloads iperl.xmq the first time, then caches the parsed driver.
const result = await decodeWmbusHex(hex, "@iperl");
```

Override the base URL or inject a custom fetcher (tests, air-gapped mirrors):

```ts
import { decodeWmbusHex, loadRemoteDriver } from "@metbox/wmbus";

// Pre-load so the call graph stays sync-friendly.
await loadRemoteDriver("multical21", {
  baseUrl: "https://my-mirror.example.com/drivers",
});

const result = await decodeWmbusHex(hex, "multical21");
```

The XMQ parser covers the driver-definition subset used by published
wmbusmeters drivers: nested blocks, single-/triple-quoted strings, match
rules (measurement_type / vif_range / storage_nr / tariff_nr /
vifcombinable / difvifkey), lookup tables, library uses, and `force_scale`
fractions like `"1/3"`. IXML grammar strings (`ixml = "..."`), calculator
expressions, and PI processing instructions are currently not supported —
drivers that need those produce a loadable but reduced `DriverDefinition`
with a warnings list.

## Multi-telegram sequences (format-signature cache)

Kamstrup compact frames (CI `0x79`) carry a 2-byte format-signature hash
that points back to the DIF/VIF layout of an earlier long telegram. Pass a
shared `MeterState` across calls so the cache survives:

```ts
import { createMeterState, decodeWmbusHex } from "@metbox/wmbus";

const state = createMeterState();
await decodeWmbusHex(longHex, "multical21", key, { meterState: state });
const compact = await decodeWmbusHex(compactHex, "multical21", key, {
  meterState: state,
});
```

`createMeterState()` also seeds the seven hard-coded Kamstrup signatures
upstream ships (`wmbus.cc:4051`) so isolated compact frames with those
well-known hashes still decode when no prior long frame is available.

## Custom drivers

```ts
import { registerCustomDriver } from "@metbox/wmbus";

registerCustomDriver({
  name: "my-custom-meter",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: 0x0DFE, version: 0x04, type: 0x40 }],
  fields: [/* see src/drivers/types.ts */],
});
```

## License

GPL-3.0-or-later. Derived from [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters)
by Fredrik Öhrström and contributors. Protocol knowledge and driver structure
inherit from the upstream C++ implementation pinned at commit `af48083`; see
`vendor/wmbusmeters@af48083/` for the reference source. Individual source
files carry their original upstream copyright attribution alongside the
Metbox contribution.

## Development

```bash
npm install
npm run harvest    # extract ~430 golden test fixtures from vendor/
npm test           # run vitest
npm run typecheck  # strict TS check
npm run check      # biome lint + format
```

## Attribution

This package is a TypeScript port of wmbusmeters guided by its source, test
fixtures, and the EN 13757 family of standards. Driver field-extraction
semantics mirror upstream behaviour so existing wM-Bus keys and decoder
configurations continue to work.
