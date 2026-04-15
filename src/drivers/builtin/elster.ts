// Elster gas meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elster.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const elster = defineDriver({
  name: "elster",
  meterType: "GasMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ELS"), version: 0x81, type: 0x03 }],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["actuality_duration_s"],
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "The total gas volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
      },
    },
  ],
});
