# @metbox/wmbus

## 0.1.0

### Minor Changes

- cb17a27: First release. Pure-TypeScript wireless M-Bus decoder, drop-in
  replacement for the WASM build of [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters).

  - 71 / 116 seed drivers at 100% upstream fixture parity (239 / 422 fixtures)
  - Full DIF/VIF parser, AES-128 (Mode 5 + Mode 7), ELL I/II/III/IV,
    AFL passthrough, wired M-Bus Format B framing
  - Declarative driver schema with `preprocess` / `postprocess` escape hatches;
    `registerCustomDriver(def)` for runtime additions without rebuilds
  - Zero runtime dependencies; ESM-only, Node 20+

  Distributed via git tag — install with
  `npm install github:Metbox/wmbus#v0.1.0`. API frozen as the three-function
  surface (`decodeWmbusHex`, `listWmbusDrivers`, `analyzeWmbusHex`) plus
  `registerCustomDriver`. See README for usage and `TODO.md` for the path
  to full upstream parity.
