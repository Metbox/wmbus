// Weptech Munia temperature / humidity sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_munia.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const WEP = flagToManufacturer("WEP");

export const munia = defineDriver({
  name: "munia",
  meterType: "TempHygroMeter",
  linkModes: [],
  mvt: [
    { manufacturer: WEP, version: 0x02, type: 0x1b },
    { manufacturer: WEP, version: 0x04, type: 0x1b },
  ],
  defaultFields: "name,id,current_temperature_c,current_relative_humidity_rh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "02FD971D" },
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
      name: "current_temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
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
  ],
});
