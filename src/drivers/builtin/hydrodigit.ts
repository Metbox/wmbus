// BMeters Hydrodigit water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_hydrodigit.cc. The meter
// emits a standard total_m3 + meter_datetime pair via normal DIF/VIF, then
// stuffs everything else (battery voltage, fraud/leak dates, backflow,
// 12 monthly totals) into a manufacturer-specific block after DIF 0x0F.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMT = flagToManufacturer("BMT");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const VOLTAGE_MAP: Readonly<Record<number, number>> = Object.freeze({
  0x01: 1.9,
  0x02: 2.1,
  0x03: 2.2,
  0x04: 2.3,
  0x05: 2.4,
  0x06: 2.5,
  0x07: 2.65,
  0x08: 2.8,
  0x09: 2.9,
  0x0a: 3.05,
  0x0b: 3.2,
  0x0c: 3.35,
  0x0d: 3.5,
});

const MASK_BATTERY_VOLTAGE_PRESENT = 1 << 0;
const MASK_FRAUD_DATE_PRESENT = 1 << 1;
const MASK_BACKWARD_FLOW_PRESENT = 1 << 2;
const MASK_DATA_HISTORY_PRESENT = 1 << 4;
const MASK_WATER_LOSS_DATE_PRESENT = 1 << 7;

function bcdByte(b: number): string {
  return b.toString(16).padStart(2, "0");
}

function voltageFor(rawNibble: number): number {
  return VOLTAGE_MAP[rawNibble & 0x0f] ?? 3.7;
}

function monthlyValue(a: number, b: number, c: number): number {
  const raw = (c << 16) | (b << 8) | a;
  const v = raw / 100;
  return v >= 100000 ? 0 : v;
}

function backflowValue(a: number, b: number, c: number, d: number): number {
  // 32-bit LE unsigned → m³ with 3 decimals.
  const raw = ((d << 24) >>> 0) + (c << 16) + (b << 8) + a;
  return raw / 1000;
}

export const hydrodigit = defineDriver({
  name: "hydrodigit",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: BMT, version: 0x06, type: 0x13 },
    { manufacturer: BMT, version: 0x06, type: 0x17 },
    { manufacturer: BMT, version: 0x07, type: 0x13 },
    { manufacturer: BMT, version: 0x07, type: 0x15 },
    { manufacturer: BMT, version: 0x07, type: 0x17 },
  ],
  defaultFields: "name,id,total_m3,meter_datetime,timestamp",
  libraryFields: ["total_m3", "meter_datetime"],
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw) return;

    // Locate DIF 0x0F — marks the start of the mfct-specific trailer.
    let mfctStart = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === 0x0f) {
        mfctStart = i + 1;
        break;
      }
    }
    if (mfctStart < 0 || mfctStart >= raw.length) return;

    let i = mfctStart;
    const frameId = raw[i++] as number;
    const explanation: string[] = [];

    if (frameId === 0x00) {
      ctx.output.contents = "";
      return;
    }

    if ((frameId & MASK_BATTERY_VOLTAGE_PRESENT) !== 0) {
      if (i >= raw.length) return;
      explanation.push("BATTERY_VOLTAGE");
      ctx.output.voltage_v = voltageFor(raw[i] as number);
      i++;
    }

    if ((frameId & MASK_FRAUD_DATE_PRESENT) !== 0) {
      if (i + 2 >= raw.length) return;
      explanation.push("FRAUD_DATE");
      const fy = raw[i] as number;
      const fmRaw = raw[i + 1] as number;
      const fd = raw[i + 2] as number;
      const fm = fmRaw & 0x0f;
      const flags = fmRaw & 0xe0;
      const types: string[] = [];
      if ((flags & 0x80) !== 0) types.push("Magnetic fraud attempt");
      if ((flags & 0x40) !== 0) types.push("Sensor fraud attempt");
      if ((flags & 0x20) !== 0) types.push("Module removed");
      ctx.output.fraud_date = `20${bcdByte(fy)}-${bcdByte(fm)}-${bcdByte(fd)}`;
      ctx.output.fraud_type = types.length === 0 ? "no type info" : types.join(", ");
      i += 3;
    }

    if ((frameId & MASK_WATER_LOSS_DATE_PRESENT) !== 0) {
      if (i + 2 >= raw.length) return;
      explanation.push("LEAK_DATE");
      const ly = raw[i] as number;
      const lm = raw[i + 1] as number;
      const ld = raw[i + 2] as number;
      ctx.output.leak_date = `20${bcdByte(ly)}-${bcdByte(lm)}-${bcdByte(ld)}`;
      i += 3;
    }

    if ((frameId & MASK_BACKWARD_FLOW_PRESENT) !== 0) {
      if (i + 3 >= raw.length) return;
      explanation.push("BACKFLOW");
      ctx.output.backflow_m3 = backflowValue(
        raw[i] as number,
        raw[i + 1] as number,
        raw[i + 2] as number,
        raw[i + 3] as number,
      );
      i += 4;
    }

    if ((frameId & MASK_DATA_HISTORY_PRESENT) !== 0) {
      explanation.push("MONTHLY_DATA");
      for (let m = 0; m < 12; m++) {
        if (i + 2 >= raw.length) return;
        ctx.output[`${MONTHS[m]}_total_m3`] = monthlyValue(
          raw[i] as number,
          raw[i + 1] as number,
          raw[i + 2] as number,
        );
        i += 3;
      }
    }

    ctx.output.contents = explanation.join(" ");
  },
});
