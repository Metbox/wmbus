// Itron Aquastream water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/aquastream.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const aquastream = defineDriver({
  name: "aquastream",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("IMT"), version: 0x01, type: 0x07 }],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["total_m3", "meter_datetime", "target_m3", "target_date"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x04, text: "LOW_BATTERY" },
              { value: 0x10, text: "TEMPORARY_ALARM" },
              { value: 0x20, text: "LEAKAGE" },
              { value: 0x30, text: "BURST" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_tariff1",
      description: "Total water consumption on tariff 1.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        tariffNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Estimated battery lifetime remaining.",
      quantity: "Time",
      // Upstream XMQ specifies `force_scale = 0.0027397260273972603` literally
      // (= 1/365, not 1/365.25). Use force_scale to match.
      scaling: "None",
      signedness: "Unsigned",
      forceScale: 1 / 365,
      forceUnit: "Year",
      match: {
        measurementType: "Instantaneous",
        difVifKey: "02FD74",
      },
    },
  ],
});
