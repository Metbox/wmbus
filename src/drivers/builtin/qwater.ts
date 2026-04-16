// Qundis qwater — upstream registers no MVTs, relies on driver-name lookup
// only. Kept for Metbox seed-driver name compatibility.

import { defineDriver } from "../registry.js";

export const qwater = defineDriver({
  name: "qwater",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["total_m3", "meter_datetime"],
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
            map: [],
          },
        ],
      },
    },
  ],
});
