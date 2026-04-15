// Sensus iPerl water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/iperl.xmq.
//
// Manufacturer: Sensus (SEN, 0x4CAE)
// MVTs: 0x68/0x06, 0x68/0x07, 0x7C/0x07.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SEN = flagToManufacturer("SEN");

export const iperl = defineDriver({
  name: "iperl",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: SEN, version: 0x68, type: 0x06 },
    { manufacturer: SEN, version: 0x68, type: 0x07 },
    { manufacturer: SEN, version: 0x7c, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,max_flow_m3h,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "The total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
      },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "The maximum water flow recorded during previous period.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "VolumeFlow",
      },
    },
  ],
});
