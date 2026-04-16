// Elvaco Sense 100W/200W/300W room sensor driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elvsense.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ELV = flagToManufacturer("ELV");

export const elvsense = defineDriver({
  name: "elvsense",
  meterType: "TempHygroMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: ELV, version: 0x50, type: 0x1b },
    { manufacturer: ELV, version: 0x51, type: 0x1b },
    { manufacturer: ELV, version: 0x52, type: 0x1b },
    { manufacturer: ELV, version: 0x53, type: 0x1b },
    { manufacturer: ELV, version: 0x54, type: 0x1b },
  ],
  defaultFields:
    "name,id,temperature_c,humidity_rh,co2_ppm,battery_v,status,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "temperature",
      description: "Instantaneous room temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Battery voltage.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Voltage" },
    },
    {
      kind: "numeric",
      name: "humidity",
      description: "Relative humidity (200W/300W).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "co2",
      description: "CO₂ concentration (300W).",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "027C03324F43" },
    },
    {
      kind: "string",
      name: "status",
      description: "Sensor status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
  ],
});
