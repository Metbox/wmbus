// BMeters RFM Ambient temperature/humidity driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_rfmamb.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMT = flagToManufacturer("BMT");

export const rfmamb = defineDriver({
  name: "rfmamb",
  meterType: "TempHygroMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: BMT, version: 0x1b, type: 0x10 }],
  defaultFields: "name,id,current_temperature_c,current_relative_humidity_rh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
    {
      kind: "numeric",
      name: "current_temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "average_temperature_1h",
      description: "Average temperature (last hour).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "average_temperature_24h",
      description: "Average temperature (last 24h).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "maximum_temperature_1h",
      description: "Maximum temperature (last hour).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "maximum_temperature_24h",
      description: "Maximum temperature (last 24h).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "minimum_temperature_1h",
      description: "Minimum temperature (last hour).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "minimum_temperature_24h",
      description: "Minimum temperature (last 24h).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "current_relative_humidity",
      description: "Current relative humidity.",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "average_relative_humidity_1h",
      description: "Average relative humidity (last hour).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "average_relative_humidity_24h",
      description: "Average relative humidity (last 24h).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "maximum_relative_humidity_1h",
      description: "Maximum relative humidity (last hour).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "maximum_relative_humidity_24h",
      description: "Maximum relative humidity (last 24h).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "RelativeHumidity",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "minimum_relative_humidity_1h",
      description: "Minimum relative humidity (last hour).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Minimum", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "minimum_relative_humidity_24h",
      description: "Minimum relative humidity (last 24h).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "RelativeHumidity",
        storageNr: 1,
      },
    },
  ],
  postprocess(ctx) {
    // Upstream declares `device` as a numeric PointInTime field with
    // VIFRange::DateTime which renders via strdatetime (no seconds) and
    // becomes `device_datetime` in the JSON. Synthesise it from the first
    // DateTime DVEntry and strip any seconds tail.
    const e = ctx.dvEntries.find(
      (x) =>
        x.measurementType === "Instantaneous" &&
        (x.vif & 0x7f) === 0x6d,
    );
    if (e && typeof e.asString === "string") {
      ctx.output.device_datetime = e.asString.slice(0, 16);
    }
  },
});
