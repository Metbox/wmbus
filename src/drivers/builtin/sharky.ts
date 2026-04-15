// Diehl Sharky heat meter (sister to sharky774/775).
//
// Port of vendor/wmbusmeters@af48083/src/driver_sharky.cc (declarative
// subset). The Diehl LFSR preprocessor isn't wired in yet — telegrams
// that need PRIOS scrambling won't decode.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const HYD = flagToManufacturer("HYD");
const DME = flagToManufacturer("DME");

export const sharky = defineDriver({
  name: "sharky",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: HYD, version: 0x20, type: 0x0d },
    { manufacturer: DME, version: 0x40, type: 0x04 },
  ],
  defaultFields: "name,id,total_kwh,total_volume_m3,status,timestamp",
  libraryFields: [
    "meter_datetime",
    "fabrication_no",
    "on_time_h",
    "operating_time_h",
    "flow_temperature_c",
    "return_temperature_c",
  ],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "volume_flow",
      description: "Current volume flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
  ],
});
