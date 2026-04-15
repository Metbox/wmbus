// IME water meter — registry stub.
import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const ime = defineDriver({
  name: "ime",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("IME"), version: 0x06, type: 0x07 }],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["total_m3", "meter_datetime"],
  fields: [],
});
