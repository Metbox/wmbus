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
// Elster gas meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elster.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const elster = defineDriver({
  name: "elster",
  meterType: "GasMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ELS"), version: 0x81, type: 0x03 }],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["actuality_duration_s"],
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "The total gas volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
      },
    },
  ],
});
