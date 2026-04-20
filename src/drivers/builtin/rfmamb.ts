/*
 * Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
  mvt: [{ manufacturer: BMT, version: 0x10, type: 0x1b }],
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
      (x) => x.measurementType === "Instantaneous" && (x.vif & 0x7f) === 0x6d,
    );
    if (e && typeof e.asString === "string") {
      ctx.output.device_datetime = e.asString.slice(0, 16);
    }
  },
});
