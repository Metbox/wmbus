// Apator OP041A water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/op041a.xmq.
//
// Manufacturer: APA (Apator), MVT: 0x1A/0x07.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const op041a = defineDriver({
  name: "op041a",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("APA"), version: 0x1a, type: 0x07 }],
  defaultFields: "name,id,total_m3,meter_datetime,timestamp",
  libraryFields: ["total_m3", "meter_datetime"],
  fields: [],
});
