// Diehl Aerius gas meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_aerius.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");

// VIFCombinable::ValueAtBaseCondC = 0x3e.
const AT_BASE_COND = 0x3e;

export const aerius = defineDriver({
  name: "aerius",
  meterType: "GasMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: DME, version: 0x03, type: 0x30 }],
  defaultFields: "name,id,total_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total gas consumption (base condition).",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        vifCombinables: [AT_BASE_COND],
      },
    },
    {
      kind: "numeric",
      name: "flow",
      description: "Current gas flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "string",
      name: "target_datetime",
      description: "Previous billing period end (date + time).",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total gas at previous billing period end.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 3,
        vifCombinables: [AT_BASE_COND],
      },
    },
  ],
});
