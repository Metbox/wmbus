// Zenner Minomess water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_minomess.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ZRI = flagToManufacturer("ZRI");

const STATUS_MAP = [
  { value: 0x8000, text: "WAS_REMOVED" },
  { value: 0x4000, text: "WAS_TAMPERED" },
  { value: 0x2000, text: "WAS_LEAKING" },
  { value: 0x1000, text: "TEMPORARY_ERROR" },
  { value: 0x0800, text: "PERMANENT_ERROR" },
  { value: 0x0400, text: "BATTERY_EOL" },
  { value: 0x0200, text: "ABNORMAL_ERROR" },
  // 0x0100 not used
  { value: 0x0080, text: "BURSTING" },
  { value: 0x0040, text: "REMOVED" },
  { value: 0x0020, text: "LEAKING" },
  { value: 0x0010, text: "WAS_BACKFLOWING" },
  { value: 0x0008, text: "BACKFLOWING" },
  { value: 0x0004, text: "WAS_BLOCKED" },
  { value: 0x0002, text: "UNDERSIZED" },
  { value: 0x0001, text: "OVERSIZED" },
];

export const minomess = defineDriver({
  name: "minomess",
  meterType: "WaterMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: ZRI, version: 0x07, type: 0x00 },
    { manufacturer: ZRI, version: 0x16, type: 0x01 },
    { manufacturer: ZRI, version: 0x06, type: 0x01 },
  ],
  defaultFields: "name,id,total_m3,target_m3,status,timestamp",
  libraryFields: [
    "meter_date",
    "fabrication_no",
    "operating_time_h",
    "on_time_h",
    "on_time_at_error_h",
    "meter_datetime",
    "total_m3",
    "total_backward_m3",
    "volume_flow_m3h",
  ],
  fields: [
    // Two "target" field declarations — upstream registers the same name
    // twice for two storage slots (8 and 1). We mirror that: declare both,
    // and the first one that matches fills the output (storage 8 in wmbus
    // telegrams, storage 1 in wired M-Bus).
    {
      kind: "numeric",
      name: "target",
      description: "Water consumption recorded at the start of this month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 8 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Date when target water consumption was recorded.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 8 },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Water consumption recorded at the start of this month (wired).",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Date when target water consumption was recorded (wired).",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS"],
      match: { difVifKey: "02FD17" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: STATUS_MAP,
          },
        ],
      },
    },
  ],
});
