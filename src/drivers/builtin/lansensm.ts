// Lansen smoke detector driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansensm.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansensm = defineDriver({
  name: "lansensm",
  meterType: "SmokeDetector",
  linkModes: ["T1"],
  mvt: [{ manufacturer: LAS, version: 0x1a, type: 0x03 }],
  defaultFields: "name,id,status,minutes_since_last_manual_test_counter,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
        // VIFCombinable::StandardConformantDataContent = 0x1d.
        vifCombinables: [0x1d],
      },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x0002, text: "LOW_BATTERY" },
              { value: 0x0004, text: "SMOKE" },
              { value: 0x0008, text: "MANUAL_TEST" },
              { value: 0x0010, text: "MALFUNCTION" },
              { value: 0x0020, text: "NO_CONNECTION_TO_SMOKE_DETECTOR" },
              { value: 0x0100, text: "SMOKE_SENSOR_END_OF_LIFE" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "async_msg_id",
      description: "Unique asynchronous message number.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "AccessNumber" },
    },
    {
      kind: "numeric",
      name: "minutes_since_last_manual_test",
      description: "Minutes since last manual test.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "Dimensionless" },
    },
  ],
});
