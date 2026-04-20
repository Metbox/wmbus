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
// Quick coverage report: how many seed drivers from Metbox's
// device-models.ts are registered in the wmbus package?

import { listWmbusDrivers } from "../src/api.js";

const SEED =
  `aerius abbb23 amiplus apator08 apator162 apator172 apatoreitn apatorna1 aquastream aventieshca aventieswm bfw240radio c5isf compact5 dme173 dme_07 ebzwmbe ehzp elf elf2 elster eltako em24 emerlin868 enercal esyswm eurisii ev200 evo868 fhkvdataiii fhkvdataiv fiowater flowiq2200 gransystems gwfwater hcae2 hydrocalm3 hydrocalm4 hydroclima hydroclimav2 hydrodigit hydrus iem3000 ime iperl istaheat itron itronheat iwmtx5 izar janz kaden kamheat kampress maddalena mkradio3 mkradio3a mkradio4 mkradio4a multical21 nemo nzr omnipower op041a picoflux pollucomf q400 qcaloric qheat qheat_55_us qheatv2 qualcosonic qwater qwaterv2 relhca rfmtx1 sensostar sharky sharky774 sharky775 sontex868 supercal supercom587 topaseskr ultraheat ultrimis unismart vario411 vario451 vario451mid waterstarm watertech weh_07 werhlemodwm wme5 zenner0b`.split(
    " ",
  );

const registered = new Set(await listWmbusDrivers());
const missing = SEED.filter((d) => !registered.has(d));

console.log(`Seed drivers:          ${SEED.length}`);
console.log(`Registered:            ${registered.size}`);
console.log(`Seed drivers covered:  ${SEED.length - missing.length} / ${SEED.length}`);
if (missing.length > 0) {
  console.log(`Missing: ${missing.join(", ")}`);
} else {
  console.log("✓ Every seed driver is registered.");
}
