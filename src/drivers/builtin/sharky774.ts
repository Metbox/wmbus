// Diehl Sharky 774 heat / heat-cooling meter.
//
// Port of vendor/wmbusmeters@af48083/src/driver_sharky774.cc. Uses standard
// CI=0x7A short TPL — no LFSR. The vendor file registers tariff-1 variants
// as cooling counterparts of the primary energy / volume fields plus a
// "at_set_date" storage-1 pair (storage index 1 is the last billing date).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");

// Upstream's VIFCombinable::RecordErrorCodeMeterToController is declared as
// an inclusive range 0x15..0x1C (dvparser.h:107). Field matcher uses the
// range form so any combinable inside that window selects the "in_error" variant.
const REC_ERROR_CODE_RANGE = { from: 0x15, to: 0x1c };

export const sharky774 = defineDriver({
  name: "sharky774",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: DME, version: 0x04, type: 0x41 },
    { manufacturer: DME, version: 0x0d, type: 0x41 },
    { manufacturer: DME, version: 0x0c, type: 0x41 },
  ],
  defaultFields: "name,id,total_energy_consumption_kwh,energy_at_set_date_kwh,set_date,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_cooling_consumption",
      description: "Total cooling energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF", tariffNr: 1 },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyVolumeVIF" },
    },
    {
      kind: "numeric",
      name: "total_cooling_volume",
      description: "Total cooling volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyVolumeVIF", tariffNr: 2 },
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
      name: "operating_time",
      description: "Operating time.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "OperatingTime" },
    },
    {
      kind: "numeric",
      name: "operating_time_in_error",
      description: "Operating time in error state.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "OperatingTime",
        vifCombinableRange: REC_ERROR_CODE_RANGE,
      },
    },
    {
      kind: "numeric",
      name: "energy_at_set_date",
      description: "Total energy consumption at set date.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "cooling_at_set_date",
      description: "Total cooling energy consumption at set date.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
        tariffNr: 1,
      },
    },
    {
      kind: "string",
      name: "set_date",
      description: "Last billing set date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
  ],
});
