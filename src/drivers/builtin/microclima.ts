// Maddalena Microclima heat meter.
//
// Port of vendor/wmbusmeters@af48083/src/driver_microclima.cc. Short
// telegram fields use standard DV decoding; the long "historic values"
// variant needs calculator-based set_date expansion that isn't implemented
// in this TS port — that test remains deferred.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const MAD = flagToManufacturer("MAD");

export const microclima = defineDriver({
  name: "microclima",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: MAD, version: 0x00, type: 0x04 }],
  defaultFields: "name,id,status,total_energy_consumption_kwh,total_volume_m3,timestamp",
  libraryFields: ["meter_datetime", "model_version", "parameter_set"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status (error flags + TPL STS bits).",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
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
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total heat energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total heating media volume.",
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
      match: { measurementType: "Instantaneous", vifRange: "PowerW" },
    },
    {
      kind: "numeric",
      name: "flow_temperature",
      description: "Flow temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "numeric",
      name: "return_temperature",
      description: "Return temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ReturnTemperature" },
    },
    {
      kind: "numeric",
      name: "temperature_difference",
      description: "Temperature difference.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "TemperatureDifference" },
    },
  ],
});
