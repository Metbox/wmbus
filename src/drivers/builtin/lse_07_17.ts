// Landis+Gyr LSE-07-17 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lse_07_17.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LSE = flagToManufacturer("LSE");

export const lse_07_17 = defineDriver({
  name: "lse_07_17",
  meterType: "WaterMeter",
  linkModes: ["S1"],
  mvt: [
    { manufacturer: LSE, version: 0x18, type: 0x06 },
    { manufacturer: LSE, version: 0x18, type: 0x07 },
    { manufacturer: LSE, version: 0x16, type: 0x07 },
    { manufacturer: LSE, version: 0x17, type: 0x07 },
    { manufacturer: LSE, version: 0xd8, type: 0x07 },
  ],
  defaultFields:
    "name,id,total_m3,due_date_m3,due_date,error_code,error_date,device_date_time,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "due_date",
      description: "Water consumption at due date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "due_date",
      description: "Due date configured on the meter.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "what_date",
      description: "Water consumption at the what date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 8 },
    },
    {
      kind: "string",
      name: "what_date",
      description: "The what date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 8 },
    },
    {
      kind: "string",
      name: "error_code",
      description: "Error code (0 means no error).",
      match: { difVifKey: "02BB56" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "error_date",
      description: "Error date, or 2127-15-31 when no error.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
    {
      kind: "string",
      name: "device_date_time",
      description: "Measurement date.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "meter_version",
      description: "Meter model/version.",
      match: { measurementType: "Instantaneous", vifRange: "ModelVersion" },
    },
  ],
});
