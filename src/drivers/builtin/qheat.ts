// Qundis Q-Heat heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qheat.cc.
//
// Manufacturer: QDS (Qundis). Two frame shapes:
//   1. Standard: DIF/VIF entries in the TPL payload (multicall21-style).
//   2. Walk-by:  outer TPL CI=0x78 wrapping a 53-byte manufacturer block
//      keyed by "0DFF5F". Postprocess extracts the five fields at fixed
//      hex offsets — mirrors `qdsExtractWalkByField` in upstream.

import { parseDv } from "../../data/dv-parser.js";
import { mediaType } from "../../protocol/media.js";
import { hexToBytes } from "../../util/hex.js";
import { emitField } from "../interpreter.js";
import { defineDriver } from "../registry.js";
import type { FieldDefinition } from "../types.js";

export const qheat = defineDriver({
  name: "qheat",
  meterType: "HeatMeter",
  linkModes: ["C1"],
  // No MVTs declared — qheat detects via the inner TPL header in upstream's
  // processContent. Resolution by name only for now.
  mvt: [],
  defaultFields:
    "name,id,total_energy_consumption_kwh,last_month_date,last_month_energy_consumption_kwh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "NO_FLOW" },
              { value: 0x02, text: "SUPPLY_SENSOR_INTERRUPTED" },
              { value: 0x04, text: "RETURN_SENSOR_INTERRUPTED" },
              { value: 0x08, text: "TEMPERATURE_ELECTRONICS_ERROR" },
              { value: 0x10, text: "BATTERY_VOLTAGE_ERROR" },
              { value: 0x20, text: "SHORT_CIRCUIT_SUPPLY_SENSOR" },
              { value: 0x40, text: "SHORT_CIRCUIT_RETURN_SENSOR" },
              { value: 0x80, text: "MEMORY_ERROR" },
              { value: 0x100, text: "SABOTAGE" },
              { value: 0x200, text: "ELECTRONICS_ERROR" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "string",
      name: "last_month_date",
      description: "Last day of previous month when total energy was recorded.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 17 },
    },
    {
      kind: "numeric",
      name: "last_month_energy_consumption",
      description: "Total energy at last day of previous month.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 17,
      },
    },
    {
      kind: "string",
      name: "last_year_date",
      description: "Last day of previous year when total energy was recorded.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "last_year_energy_consumption",
      description: "Total energy at last day of previous year.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
      },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Device date time.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "device_error_date",
      description: "Device error date.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
  ],
  postprocess(ctx) {
    // Qundis walk-by message: the outer CI=0x78 carries a "0779" inner-TPL
    // record (id+mfct+version+type, 8 bytes) and a "0DFF5F" 53-byte block
    // with five fields at fixed byte offsets. Mirrors upstream processContent
    // + `qdsExtractWalkByField`.
    const innerTpl = ctx.dvEntries.find((e) => e.difVifKey === "0779");
    if (innerTpl && innerTpl.rawValue.length === 8) {
      // Re-render the id from the inner TPL (4 LE bytes, BCD-reversed hex).
      const [b0, b1, b2, b3, m0, m1, _ver, typ] = Array.from(innerTpl.rawValue) as number[];
      const id = [b3, b2, b1, b0]
        .map((b) => (b as number).toString(16).padStart(2, "0"))
        .join("");
      ctx.output.id = id;
      const mfct = (m1 as number) * 256 + (m0 as number);
      ctx.output.media = mediaType(typ as number, mfct);
    }

    const walkBy = ctx.dvEntries.find((e) => e.difVifKey === "0DFF5F");
    if (!walkBy || walkBy.rawValue.length !== 53) return;

    const raw = walkBy.rawValue;

    // Upstream's offsets are hex-string positions; halve them for bytes.
    const specs: WalkBySpec[] = [
      {
        byteOffset: 12,
        byteLen: 4,
        difVifHex: "0C05",
        field: {
          kind: "numeric",
          name: "total_energy_consumption",
          description: "Total energy consumption (walk-by).",
          quantity: "Energy",
          scaling: "Auto",
          signedness: "Signed",
          match: { vifRaw: 0x05 },
        },
      },
      {
        byteOffset: 16,
        byteLen: 2,
        difVifHex: "426C",
        field: {
          kind: "string",
          name: "last_year_date",
          description: "Last year date (walk-by).",
          match: { vifRaw: 0x6c },
        },
      },
      {
        byteOffset: 18,
        byteLen: 4,
        difVifHex: "4C05",
        field: {
          kind: "numeric",
          name: "last_year_energy_consumption",
          description: "Last year energy (walk-by).",
          quantity: "Energy",
          scaling: "Auto",
          signedness: "Signed",
          match: { vifRaw: 0x05 },
        },
      },
      {
        byteOffset: 22,
        byteLen: 2,
        difVifHex: "C2086C",
        field: {
          kind: "string",
          name: "last_month_date",
          description: "Last month date (walk-by).",
          match: { vifRaw: 0x6c },
        },
      },
      {
        byteOffset: 24,
        byteLen: 4,
        difVifHex: "CC0805",
        field: {
          kind: "numeric",
          name: "last_month_energy_consumption",
          description: "Last month energy (walk-by).",
          quantity: "Energy",
          scaling: "Auto",
          signedness: "Signed",
          match: { vifRaw: 0x05 },
        },
      },
    ];

    for (const spec of specs) {
      const dvPrefix = hexToBytes(spec.difVifHex);
      const slice = raw.slice(spec.byteOffset, spec.byteOffset + spec.byteLen);
      const composed = new Uint8Array(dvPrefix.length + slice.length);
      composed.set(dvPrefix, 0);
      composed.set(slice, dvPrefix.length);
      const { entries } = parseDv(composed);
      if (entries.length === 0) continue;
      emitField(ctx.output, spec.field, entries[0] as never);
    }

    // Fall back to heat when no inner-TPL media is available.
    if (!("media" in ctx.output) || ctx.output.media === "Unknown") {
      ctx.output.media = "heat";
    }
  },
});

interface WalkBySpec {
  byteOffset: number;
  byteLen: number;
  difVifHex: string;
  field: FieldDefinition;
}
