// Diehl Izar / IZAR water meter (Diehl PRIOS scrambling).
//
// Port of vendor/wmbusmeters@af48083/src/driver_izar.cc. The payload is
// LFSR-scrambled using a 32-bit seed derived from the meter id and a
// manufacturer key (one of two defaults unless the owner programmed a custom
// one). Alarm/battery bytes live in the un-scrambled header (frame[11..14])
// and are read directly; total / last_month_total / billing date come from
// the descrambled payload block.

import {
  DiehlLfsrCheckMethod,
  decodeDiehlLfsr,
  diehlConvertKey,
  PRIOS_DEFAULT_KEYS_HEX,
} from "../../crypto/diehl-lfsr.js";
import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { hexToBytes } from "../../util/hex.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");
const HYD = flagToManufacturer("HYD");
const SAP = flagToManufacturer("SAP");

const DEFAULT_SEEDS: readonly number[] = PRIOS_DEFAULT_KEYS_HEX.map((hex) =>
  diehlConvertKey(hexToBytes(hex)),
);

function leUint32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] as number) |
      ((data[offset + 1] as number) << 8) |
      ((data[offset + 2] as number) << 16) |
      ((data[offset + 3] as number) << 24)) >>>
    0
  );
}

interface IzarAlarms {
  generalAlarm: boolean;
  leakageCurrently: boolean;
  leakagePreviously: boolean;
  meterBlocked: boolean;
  backFlow: boolean;
  underflow: boolean;
  overflow: boolean;
  submarine: boolean;
  sensorFraudCurrently: boolean;
  sensorFraudPreviously: boolean;
  mechanicalFraudCurrently: boolean;
  mechanicalFraudPreviously: boolean;
}

function readAlarms(frame: Uint8Array): IzarAlarms {
  const b11 = frame[11] ?? 0;
  const b12 = frame[12] ?? 0;
  const b13 = frame[13] ?? 0;
  return {
    generalAlarm: b11 >> 7 === 1,
    leakageCurrently: b12 >> 7 === 1,
    leakagePreviously: ((b12 >> 6) & 1) === 1,
    meterBlocked: ((b12 >> 5) & 1) === 1,
    backFlow: b13 >> 7 === 1,
    underflow: ((b13 >> 6) & 1) === 1,
    overflow: ((b13 >> 5) & 1) === 1,
    submarine: ((b13 >> 4) & 1) === 1,
    sensorFraudCurrently: ((b13 >> 3) & 1) === 1,
    sensorFraudPreviously: ((b13 >> 2) & 1) === 1,
    mechanicalFraudCurrently: ((b13 >> 1) & 1) === 1,
    mechanicalFraudPreviously: (b13 & 1) === 1,
  };
}

function currentAlarmsText(a: IzarAlarms): string {
  const parts: string[] = [];
  if (a.leakageCurrently) parts.push("leakage");
  if (a.meterBlocked) parts.push("meter_blocked");
  if (a.backFlow) parts.push("back_flow");
  if (a.underflow) parts.push("underflow");
  if (a.overflow) parts.push("overflow");
  if (a.submarine) parts.push("submarine");
  if (a.sensorFraudCurrently) parts.push("sensor_fraud");
  if (a.mechanicalFraudCurrently) parts.push("mechanical_fraud");
  if (parts.length === 0) return "no_alarm";
  if (a.generalAlarm) return "general_alarm";
  return parts.join(",");
}

function previousAlarmsText(a: IzarAlarms): string {
  const parts: string[] = [];
  if (a.leakagePreviously) parts.push("leakage");
  if (a.sensorFraudPreviously) parts.push("sensor_fraud");
  if (a.mechanicalFraudPreviously) parts.push("mechanical_fraud");
  if (parts.length === 0) return "no_alarm";
  return parts.join(",");
}

/**
 * Try the user-supplied key first (if any) then the two PRIOS defaults.
 * Returns the first seed that produces a 0x4B-prefixed decode.
 */
function tryDescramble(frame: Uint8Array, aesKey: Uint8Array | null): Uint8Array | null {
  const seeds: number[] = [];
  if (aesKey && aesKey.length >= 8) seeds.push(diehlConvertKey(aesKey));
  seeds.push(...DEFAULT_SEEDS);

  for (const seed of seeds) {
    const decoded = decodeDiehlLfsr(frame, frame, seed, DiehlLfsrCheckMethod.HEADER_1_BYTE, 0x4b);
    if (decoded.length > 0) return decoded;
  }
  return null;
}

/**
 * SAP_PRIOS variant encodes the prefix (serial format-letter triplet) and a
 * serial-number/manufacture-year pair inside the DLL address bytes. Port of
 * the supplier_code / meter_type / diameter bit-slicing in driver_izar.cc:226.
 */
function decodeSapPriosPrefix(frame: Uint8Array): {
  prefix: string;
  serialNumber: string;
  manufactureYear: string;
} {
  const b4 = frame[4] ?? 0;
  const b5 = frame[5] ?? 0;
  const b6 = frame[6] ?? 0;
  const b7 = frame[7] ?? 0;
  const b8 = frame[8] ?? 0;
  const b9 = frame[9] ?? 0;

  // `origin[7] & 0x03` << 24 | origin[6] << 16 | origin[5] << 8 | origin[4]
  const digitsInt = ((b7 & 0x03) << 24) | (b6 << 16) | (b5 << 8) | b4;
  const digits = digitsInt.toString().padStart(8, "0");
  const yy = Number.parseInt(digits.slice(0, 2), 10);
  const serialNumber = digits.slice(2).padStart(6, "0");
  const manufactureYear = String(yy > 70 ? 1900 + yy : 2000 + yy);

  const supplierCode = String.fromCharCode(0x40 + (((b9 & 0x0f) << 1) | (b8 >> 7)));
  const meterType = String.fromCharCode(0x40 + ((b8 & 0x7c) >> 2));
  const diameter = String.fromCharCode(0x40 + (((b8 & 0x03) << 3) | (b7 >> 5)));
  const prefix = `${supplierCode}${digits.slice(0, 2)}${meterType}${diameter}`;
  return { prefix, serialNumber, manufactureYear };
}

export const izar = defineDriver({
  name: "izar",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: HYD, version: 0x07, type: 0x85 },
    { manufacturer: SAP, version: 0x15, type: 0x00 },
    { manufacturer: SAP, version: 0x04, type: 0x00 },
    { manufacturer: SAP, version: 0x07, type: 0x00 },
    { manufacturer: DME, version: 0x07, type: 0x78 },
    { manufacturer: DME, version: 0x06, type: 0x78 },
    { manufacturer: HYD, version: 0x07, type: 0x86 },
  ],
  defaultFields:
    "name,id,prefix,serial_number,total_m3,last_month_total_m3," +
    "last_month_measure_date,remaining_battery_life_y,current_alarms," +
    "previous_alarms,transmit_period_s,manufacture_year,timestamp",
  fields: [],
  postprocess(ctx) {
    // Izar is always a water meter; upstream's SAP_PRIOS address transform
    // rewrites the type byte to 0x07 (water). We don't rewrite the frame but
    // the driver knows its media unconditionally.
    ctx.output.media = "water";

    const frame = ctx.frame;
    if (!frame || frame.length < 15) {
      reorderIzarFields(ctx.output, false);
      return;
    }

    const alarms = readAlarms(frame);
    const currentAlarms = currentAlarmsText(alarms);
    const previousAlarms = previousAlarmsText(alarms);
    const transmitPeriodS = 1 << (((frame[11] ?? 0) & 0x0f) + 2);
    const remainingBatteryLifeY = ((frame[12] ?? 0) & 0x1f) / 2.0;

    // SAP_PRIOS-specific identity fields — only present when the DLL
    // manufacturer is SAP (0x4C30). CI 0xA0..0xA7 with mfct=SAP triggers
    // this branch in upstream.
    const mfct = (frame[2] ?? 0) | ((frame[3] ?? 0) << 8);
    if (mfct === SAP) {
      const { prefix, serialNumber, manufactureYear } = decodeSapPriosPrefix(frame);
      ctx.output.prefix = prefix;
      ctx.output.serial_number = serialNumber;
      ctx.output.manufacture_year = manufactureYear;
    }

    // Volume fields come from the LFSR-descrambled payload block. For very
    // short frames (truncated simulation fixtures) there's nothing to
    // decode; skip to leave volume fields absent rather than crash.
    const decoded = frame.length >= 15 ? tryDescramble(frame, null) : null;
    if (decoded !== null && decoded.length >= 5) {
      const totalL = leUint32(decoded, 1);
      ctx.output.total_m3 = round3(totalL / 1000);
      if (decoded.length >= 9) {
        const lastMonthL = leUint32(decoded, 5);
        ctx.output.last_month_total_m3 = round3(lastMonthL / 1000);
      }
      if (decoded.length >= 11) {
        const d9 = decoded[9] as number;
        const d10 = decoded[10] as number;
        let year = ((d10 & 0xf0) >> 1) + ((d9 & 0xe0) >> 5);
        year += year > 80 ? 1900 : 2000;
        const month = d10 & 0x0f;
        const day = d9 & 0x1f;
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        ctx.output.last_month_measure_date = `${year}-${mm}-${dd}`;
      }
    }

    ctx.output.remaining_battery_life_y = remainingBatteryLifeY;
    ctx.output.current_alarms = currentAlarms;
    ctx.output.previous_alarms = previousAlarms;
    ctx.output.transmit_period_s = transmitPeriodS;

    reorderIzarFields(ctx.output, mfct === SAP);
  },
});

/**
 * Izar's JSON output has a fixed key order that mirrors upstream's
 * `defaultFields`. The interpreter emits `_ media meter name id` and then
 * `timestamp` last; this helper pulls the postprocess-emitted fields into
 * the right positions between.
 */
function reorderIzarFields(out: Record<string, unknown>, isSap: boolean): void {
  const ordered: Record<string, unknown> = {};
  ordered._ = out._;
  ordered.media = out.media;
  ordered.meter = out.meter;
  if (out.name !== undefined) ordered.name = out.name;
  ordered.id = out.id;
  if (isSap) {
    ordered.prefix = out.prefix;
    ordered.serial_number = out.serial_number;
  }
  if ("total_m3" in out) ordered.total_m3 = out.total_m3;
  if ("last_month_total_m3" in out) ordered.last_month_total_m3 = out.last_month_total_m3;
  if ("last_month_measure_date" in out)
    ordered.last_month_measure_date = out.last_month_measure_date;
  ordered.remaining_battery_life_y = out.remaining_battery_life_y;
  ordered.current_alarms = out.current_alarms;
  ordered.previous_alarms = out.previous_alarms;
  ordered.transmit_period_s = out.transmit_period_s;
  if (isSap) ordered.manufacture_year = out.manufacture_year;
  ordered.timestamp = out.timestamp;

  // Replace the output's keys in-place so the caller gets the ordered view.
  for (const k of Object.keys(out)) delete out[k];
  Object.assign(out, ordered);
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
