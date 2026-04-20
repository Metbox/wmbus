# @metbox/wmbus — remaining work

State at last checkpoint (commit `ba9d37b`):

- **71 / 116** seed drivers at 100% fixture parity
- **239 / 422** upstream fixtures pass byte-for-byte
- **217 / 217** unit tests green

Everything below is what's left to reach full upstream parity.

---

## 1. Framework features still missing

These are the big-lever items — each one unlocks a cluster of drivers at once.
Order of impact (biggest first).

### 1.1 IXML grammar engine (~ 60 fixtures)

Upstream ships a mini parser generator for mfct-specific frames. Fields
declare `ixml = "decode = ..."` and `@DV_xxxx` annotations that synthesise
DVEntries from fixed byte positions.

Blocks:
- `apator08` (0/3), `apator162` (0/14), `apator172` (0/2), `apatorna1` (0/1) —
  23 fixtures just from the Apator family
- `microclima` (0/2)
- `qwater` (0/28), `qwaterv2` (0/8), `qheatv2` (0/6)

Implementation sketch:
- Port upstream's `ixml.cc` grammar loader (~500 LoC).
- Support at minimum: sequence rules, alternation, terminals `hex`/`byte`/`word`/`triplet`/`quad`,
  `@DV_xxx` annotations, `>dvk = +'hex'` DV key bindings, `match_entire_payload`.
- Hook into our driver pipeline: if a field has `ixml`, run the grammar
  against the mfct payload, register synthetic DVEntries under the declared
  keys, then the existing declarative matchers pick them up.

### 1.2 Format-signature caching (~ 15 fixtures)

Kamstrup-family compact frames (CI `0x79`) carry a 2-byte hash referring to a
format block sent in a prior long-form telegram. Without caching, compact
frames decode as random bytes.

Blocks:
- `multical21` (4/8), `multical302` (2/4), `multical403` (1/2),
  `multical602` (1/2) — 8 fixtures
- `omnipower` (1/2), `flowiq2200` (3/4), `kampress` (1/3), `qcaloric` (14/16)

Implementation sketch:
- In-memory `WeakMap<meterId, Map<sigHash, format_bytes>>` populated when a long
  telegram is decoded.
- When a 0x79 compact frame arrives, look up the signature. If found, replay
  the format bytes + compact data bytes through the DV parser.
- Test-runner changes: the sweep must feed fixtures in declaration order per
  `(driver, id)` so the long telegram populates the cache before the compact
  follow-up is seen.

### 1.3 Diehl PRIOS / LFSR preprocess (~ 15 fixtures)

Diehl meters scramble their payload with a custom LFSR keyed on the meter
address. Without it, `sharky`, `izar`, encrypted `hydrus` variants decode as
noise.

Blocks:
- `izar` (0/12), `sharky774` (0/6), `sharky` (3/4 remaining), `hydrus` (10/12 remaining)

Implementation sketch:
- Port `manufacturer_specificities.cc:167` LFSR verbatim (already have the
  unit tests at `test/unit/diehl-lfsr.test.ts` — just wire the preprocess).
- Add a driver-level `preprocess` hook invocation for HYD/DME manufacturer
  codes or specific MVTs.
- PRIOS detection byte pattern check before applying LFSR.

### 1.4 Numeric PointInTime date normalisation (~ 4 fixtures)

Upstream's library `target_date` declares `Quantity::PointInTime` + `Unit::DateLT`,
which routes through `mktime(&tm)` before rendering — normalising
`month=15` → rolls year up, `day=0` → last day of previous month.

Today we have one shim per driver (gwfwater, istaheat). Generalise it in
the interpreter so any numeric field declared with quantity `PointInTime`
and matched against a `Date`/`DateTime` DVEntry goes through the mktime-
equivalent JS `Date` normaliser.

### 1.5 `addNumericFieldWithCalculator` (~ 10 fixtures)

Upstream supports inline expressions like
`"history_reference_date - ((storage_counter-1counter) * 1 month)"` and
`"sqrt((a*a)+(b*b))"` for derived fields.

Blocks:
- `em24` (0/3) reactive/apparent energy
- `multical302` (2/4) `power_kw` derived from other fields
- Some `evo868` history date fields currently hacked via postprocess

Implementation sketch:
- Simple 4-op expression parser (no precedence needed beyond parens — use
  a shunting-yard or recursive-descent).
- Support: `sqrt(expr)`, `fieldname_unit`, literal numbers, `+ - * /`,
  counter references like `storage_counter`, date arithmetic `<date> - (N * 1 month)`.
- Evaluate at postprocess time using the already-emitted output keys.

### 1.6 INJECT_INTO_STATUS property (~ 8 fixtures)

Upstream's print property merges additional status fields (mfct_status,
head_status, status16, status_narrow …) into the single `status` string.

Today we handle it manually per-driver (ei6500, gwfwater). Generalise:

- Fields with `properties: ["INJECT_INTO_STATUS", "HIDE"]` should be
  accumulated and merged into the field tagged `STATUS`, sorted
  alphabetically, before emission.
- Requires a second pass after all fields extract so status-injection
  happens at the right time.

Benefits: cleaner kamheat (status16 + status_narrow), hydrocalm4, c5isf.

### 1.7 Per-meter state sharing between telegrams (~ 8 fixtures)

Upstream's test runner keeps a single meter instance alive across the
`// Test:` block, so a second telegram inherits fields from the first.

Blocks:
- `qcaloric` (14/16) — MyElement2 3rd telegram needs values from 2nd
- `multical` family compact-frame follow-ups
- Several `hydrus` fixtures

Implementation sketch:
- Sweep harness groups fixtures by `(driver, configured_id)`.
- Long-lived `Meter` object that remembers previously emitted field values.
- On decode of a later telegram, merge missing fields from the cache.
- This is test-runner-only — production decodes are still one-shot.

---

## 2. Driver-specific work

These drivers need hand-written postprocess logic but no new framework
pieces. Each one is an afternoon's work.

| Driver | Fixtures | Notes |
|---|---|---|
| `bfw240radio` | 0/6 | Techem HCA with CI=0xA2 mfct frame; similar shape to compact5 |
| `c5isf` | 0/5 | Kamstrup C5isf — needs multi-rule status lookup + month-history postprocess |
| `eltako` | 0/1 | Electricity meter with multiple difvifkey counters |
| `em24` | 0/3 | Needs calculator (see 1.5) + reactive_energy handling |
| `esyswm` | 0/4 | Electricity meter with 3-phase power sum (already patterned via ebzwmbe) |
| `fhkvdataiv` | 1/2 | Simulation fixture encrypted, harvester needs key (see section 3) |
| `gransystems` | 0/4 | Multi-rule status with TriggerBits (single-phase vs three-phase) |
| `hydrocalm4` | 0/5 | Mfct TPL status bits + heat/cooling split via IndexNr |
| `ime` | 0/4 | Tariff-based fields with negative/positive split |
| `itron` | 0/4 | Mode 5 AES (with key), enhanced_id + unknown_a custom key |
| `nemo` | 0/3 | 3-phase electricity with active/reactive split |
| `qheat_55_us` | 0/2 | Qundis walk-by variant (similar to qheat but diff positions) |
| `relhca` | 0/1 | Simple HCA; library field name mismatch (current_consumption_hca vs consumption_hca) |
| `rfmtx1` | 0/2 | BMeters RFM TX1 with custom XOR de-obfuscation using 16-vector lookup table |
| `sensostar` | 4/5 | One telegram variant missing; likely Format B or key-needed |
| `supercom587` | 6/10 | Simulation_shell.txt fixtures expect reduced field set — harvester issue |
| `topaseskr` | 0/3 | Mfct-specific date + flow fields |
| `tsd2` | 0/4 | Short-frame or Format B framing issue (parser currently throws) |
| `unismart` | 0/2 | Amex gas meter with complex lookup + mfct trailer |
| `vario411` | 0/1 | Needs target_date + target_kwh pair emission |
| `vario451mid` | 0/1 | MID variant of vario451 with different layout |
| `waterstarm` | 0/9 | Mfct status bits + backward flow |
| `werhlemodwm` | 0/1 | target_10_date N-th storage pattern |

---

## 3. Fixture harvester limitations

These are things to fix in `scripts/harvest-fixtures.ts` rather than in
drivers. Some of the above "0/X" failures are actually harvester bugs.

### 3.1 Multi-telegram test blocks

Some `// Test:` blocks include a comma-separated list of telegrams meant to
be fed in sequence to the same meter. The harvester currently takes the
first hex and ignores the rest — the second telegram in kampress, kamheat
Heato, and qcaloric MyElement2 are dropped this way.

Fix: harvest each telegram in the list as a separate fixture with a sequence
index. Combined with framework 1.7 (per-meter state) this unlocks ~8 fixtures.

### 3.2 AES key extraction

Simulation files (`simulations/simulation_*.txt`) expect the test harness to
know the meter's AES key from a separate meter-config block. Harvester
currently reads `NOKEY` for all simulation fixtures → encrypted fixtures
fail at decryption.

Fix: parse the `{name: "...", key: "..."}` header at the top of simulation
files and associate keys with meter ids.

### 3.3 Commented-out tests

A handful of fixtures are inside `/* */` in the upstream source — the
harvester's line-based scanner picks them up anyway. Drop the ones inside
C++/XMQ block comments.

Affected: some hydroclimav2, sharky tests (fixtures were accepted but the
tests weren't actually run upstream).

### 3.4 Shell-format output

`simulation_metershell.txt` and `simulation_shell.txt` emit field-list
output (semicolon-separated), not JSON. Harvester currently captures these
as JSON expectations → false failures in `supercom587`, `multical21`.

Fix: skip these simulation files OR add a separate shell-format comparison
mode.

---

## 4. Nice-to-have polish (can defer indefinitely)

- Add `analyze()` plain-text output format alongside the JSON
- Fuzz-test the pipeline with upstream's `fuzz_testcases/` inputs
- Document driver authoring: `docs/writing-a-driver.md` with the declarative
  schema reference + postprocess examples
- CHANGELOG entries per release

---

## Current snapshot — failing drivers (45)

```
apator08      0/3      IXML
apator162     0/14     IXML
apator172     0/2      IXML
apatorna1     0/1      IXML
bfw240radio   0/6      Mfct-specific postprocess
c5isf         0/5      Multi-rule status + INJECT_INTO_STATUS
eltako        0/1      Driver port
em24          0/3      Calculator
esyswm        0/4      Phase-sum calculator
fhkvdataiv    1/2      Harvester AES key
flowiq2200    3/4      Format sig caching
gransystems   0/4      TriggerBits status
hydrocalm4    0/5      Per-meter state + INJECT_INTO_STATUS
hydrus        2/12     Diehl LFSR (most)
ime           0/4      Driver port
itron         0/4      AES key + enhanced_id
izar          0/12     Diehl LFSR
kamheat       7/9      Multi-telegram (harvester)
kampress      1/3      Multi-telegram (harvester)
lse_07_17     6/7      Storage-8 fields, minor
microclima    0/2      Calculator + IXML
multical21    4/8      Format sig caching
multical302   2/4      Format sig + calculator
multical403   1/2      Format sig caching
multical602   1/2      Format sig caching
nemo          0/3      Driver port (3-phase)
qcaloric      14/16    Per-meter state
qheat_55_us   0/2      Walk-by variant
qheatv2       0/6      IXML
qwater        0/28     IXML (big one)
qwaterv2      0/8      IXML
relhca        0/1      Library field rename
rfmtx1        0/2      XOR de-obfuscation
sensostar     4/5      One variant missing
sharky        1/4      Diehl LFSR
sharky774     0/6      Diehl LFSR
supercom587   6/10     Harvester shell format
topaseskr     0/3      Driver port
tsd2          0/4      Short-frame / Format B
unismart      0/2      Driver port
vario411      0/1      Driver port
vario451      2/3      Unit-conversion fixture
vario451mid   0/1      Driver port
waterstarm    0/9      Driver port
werhlemodwm   0/1      Driver port
```

Focus order for maximum fixture count per hour:
1. **IXML engine** (+ ~60 fixtures) — biggest single win
2. **Harvester multi-telegram** (+ ~8 fixtures) — unblocks some "close" drivers
3. **Format-signature caching** (+ ~15 fixtures)
4. **Diehl LFSR** (+ ~15 fixtures)
5. **Per-meter state** (+ ~8 fixtures)
6. **Driver backlog** — individual 1-6 fixture drivers
