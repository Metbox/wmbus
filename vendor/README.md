# `vendor/wmbusmeters@af48083/`

Reference copy of the [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters)
C++ source tree, pinned at commit `af48083a168b4317ef5353afe3b6f9973c6a2be1`
(the same commit previously consumed by `api/wmbusmeters-wasm/build.sh`).

**This code is NOT compiled, imported, or executed by `@metbox/wmbus`.** It is
checked in purely as an offline reference for the TypeScript port:

- `src/` — wire-format parsers, drivers, and crypto that the TS port reimplements layer by layer.
- `simulations/` — ~140 simulation files used by `scripts/harvest-fixtures.ts`
  to produce golden-file parity test records.
- `tests/` — expected-output snapshots used by the upstream CI, also consumed
  by the fixture harvester.
- `drivers/` — upstream's dynamic XMQ driver definitions (the static C++
  drivers in `src/driver_*.cc` are what we port; these XMQs are a useful
  cross-reference of the declarative schema).

## License

Upstream wmbusmeters is GPL-3.0-or-later. `@metbox/wmbus` carries the same
license, so this vendored copy is redistribution-compatible. See `LICENSE`.

## Do not edit

If the upstream commit ever needs to move:

1. Update `package.json` (n/a, version is in directory name) and bump the
   directory name to `wmbusmeters@<new-commit>`.
2. Re-run `npm run harvest` to regenerate `test/fixtures/upstream.json`.
3. Re-run the full parity suite — any new driver-test fixture mismatches need
   a TS fix before the upgrade merges.
