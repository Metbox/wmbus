// Vipa Kaden heat cost allocation driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/kaden.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const kaden = defineDriver({
  name: "kaden",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("VIP"), version: 0x1e, type: 0x08 }],
  defaultFields: "name,id,status,consumption_hca,timestamp",
  libraryFields: [
    "consumption_hca",
    "target_hca",
    "meter_datetime",
    "target_date",
    "fabrication_no",
    "external_temperature_c",
    "flow_temperature_c",
  ],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
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
              { value: 0x0001, text: "VOLTAGE_INTERRUPTED" },
              { value: 0x0004, text: "SENSOR_T2_OUTSIDE_MEASURING_RANGE" },
              { value: 0x0008, text: "SENSOR_T1_OUTSIDE_MEASURING_RANGE" },
              { value: 0x0020, text: "SENSOR_T3_OUTSIDE_MEASURING_RANGE" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "no_measurement_duration",
      description: "Hours the meter has been removed during winter.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Unsigned",
      forceUnit: "Hour",
      match: { difVifKey: "0475" },
    },
    {
      kind: "numeric",
      name: "no_measurement_duration_last_year",
      description: "Hours removed during previous winter.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Unsigned",
      forceUnit: "Hour",
      match: { difVifKey: "4475" },
    },
    {
      kind: "numeric",
      name: "tampering_duration",
      description: "Total time the device has been removed from the radiator.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Unsigned",
      forceUnit: "Hour",
      match: { difVifKey: "0474" },
    },
  ],
});
