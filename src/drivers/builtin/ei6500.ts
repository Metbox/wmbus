// Ei Electronics Ei6500 smoke detector driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_ei6500.cc. The head_status
// field uses a BitToString lookup on the same DV entry as dust_level /
// battery_level / obstacle_distance — those three pick disjoint nibbles
// of the 32-bit status word, so we split them in the postprocess hook
// below (IndexToString on overlapping masks isn't expressible with the
// current declarative schema).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const EIE = flagToManufacturer("EIE");

const BATTERY_LEVELS: Readonly<Record<number, string>> = Object.freeze({
  0x0: "2.25V",
  0x1: "2.30V",
  0x2: "2.35V",
  0x3: "2.40V",
  0x4: "2.45V",
  0x5: "2.50V",
  0x6: "2.55V",
  0x7: "2.60V",
  0x8: "2.65V",
  0x9: "2.70V",
  0xa: "2.75V",
  0xb: "2.80V",
  0xc: "2.85V",
  0xd: "2.90V",
  0xe: "2.95V",
  0xf: "3.00V",
});

const OBSTACLE_DISTANCE: Readonly<Record<number, string>> = Object.freeze({
  0x0: "SEODS_NOT_COMPLETED",
  0x1: "",
  0x2: "45_TO_60_CM",
  0x3: "38_TO_53_CM",
  0x4: "33_TO_48_CM",
  0x5: "28_TO_40_CM",
  0x6: "20_TO_33_CM",
  0x7: "0_TO_25_CM",
});

const HEAD_STATUS_BITS: Array<[number, string]> = [
  [0x00000020, "SOUNDER_FAULT"],
  [0x00000040, "TAMPER_WHILE_REMOVED"],
  [0x00000080, "EOL_REACHED"],
  [0x00001000, "LOW_BATTERY_FAULT"],
  [0x00002000, "ALARM_SENSOR_FAULT"],
  [0x00004000, "OBSTACLE_DETECTOR_FAULT"],
  [0x00008000, "EOL_WITHIN_12_MONTH"],
  [0x00020000, "ENV_CHANGED_SINCE_INSTALLATION"],
  [0x00040000, "COMM_TO_HEAD_FAULT"],
  [0x00080000, "INTERFERENCE_PREVENTING_OBSTACLE_DETECTION"],
  [0x01000000, "OBSTACLE_DETECTED"],
  [0x02000000, "SMOKE_DETECTOR_FULLY_COVERED"],
];

export const ei6500 = defineDriver({
  name: "ei6500",
  meterType: "SmokeDetector",
  linkModes: ["T1"],
  mvt: [{ manufacturer: EIE, version: 0x1a, type: 0x0c }],
  defaultFields: "name,id,status,last_alarm_date,alarm_counter,timestamp",
  fields: [
    {
      kind: "string",
      name: "last_alarm_date",
      description: "Date of last smoke alarm trigger.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Date",
        subUnitNr: 1,
        tariffNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "alarm",
      description: "Number of smoke-alarm triggers.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "CumulationCounter",
        subUnitNr: 1,
        tariffNr: 1,
      },
    },
    {
      kind: "string",
      name: "software_version",
      description: "Meter software version.",
      match: { measurementType: "Instantaneous", vifRange: "SoftwareVersion" },
    },
    {
      kind: "string",
      name: "message_datetime",
      description: "Device date-time.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "numeric",
      name: "duration_removed",
      description: "Duration the alarm has been removed.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DurationOfTariff",
        subUnitNr: 1,
        tariffNr: 2,
      },
    },
    {
      kind: "string",
      name: "last_remove_date",
      description: "Date the alarm was last removed.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Date",
        subUnitNr: 1,
        tariffNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "removed",
      description: "Number of times the alarm was removed.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "CumulationCounter",
        subUnitNr: 1,
        tariffNr: 2,
      },
    },
    {
      kind: "string",
      name: "test_button_last_date",
      description: "Date of last test button press.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Date",
        subUnitNr: 1,
        tariffNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "test_button",
      description: "Number of test button presses.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "CumulationCounter",
        subUnitNr: 1,
        tariffNr: 3,
      },
    },
    {
      kind: "string",
      name: "installation_date",
      description: "Installation date.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Date",
        tariffNr: 2,
      },
    },
    {
      kind: "string",
      name: "last_sound_check_date",
      description: "Last piezo speaker check date.",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Date",
        storageNr: 1,
      },
    },
  ],
  postprocess(ctx) {
    // The head_status 32-bit value (DIF/VIF "8440FF2C") encodes dust level,
    // battery level, obstacle distance, and bit flags. Decompose it here.
    const headEntry = ctx.dvEntries.find((e) => e.difVifKey === "8440FF2C");
    const headRaw = headEntry?.asNumber;
    if (typeof headRaw === "number") {
      const word = headRaw >>> 0;
      ctx.output.dust_level = `DUST_${word & 0x0f}`;
      ctx.output.battery_level = BATTERY_LEVELS[(word >> 8) & 0x0f] ?? "";
      ctx.output.obstacle_distance = OBSTACLE_DISTANCE[(word >> 20) & 0x07] ?? "";

      // head_status bit flags merge into the status string ("INJECT_INTO_STATUS").
      const flags: string[] = [];
      for (const [mask, name] of HEAD_STATUS_BITS) {
        if ((word & mask) !== 0) flags.push(name);
      }
      // Inverse-polarity bit: "SEODS_NOT_YET_COMPLETED" when bit 16 is NOT set.
      if ((word & 0x00010000) === 0) flags.push("SEODS_NOT_YET_COMPLETED");

      // TODO: ERROR_FLAGS field + TPL status should combine in too.
      const status = flags.length === 0 ? "OK" : flags.sort().join(" ");
      ctx.output.status = status;
    } else {
      ctx.output.status = "OK";
    }
  },
});
