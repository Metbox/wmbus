// Audit using the actual pipeline's effective MVT (TPL overrides DLL),
// not just raw byte[8]/byte[9].

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/drivers/builtin/index.js";
import { lookupDriverByName } from "../src/drivers/registry.js";
import { decodeTelegram } from "../src/protocol/pipeline.js";
import { hexToBytes } from "../src/util/hex.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES = resolve(__dirname, "..", "test", "fixtures", "upstream.json");

interface Fixture {
  driver: string;
  hex: string;
  source: string;
  key?: string;
}

const fixtures: Fixture[] = JSON.parse(readFileSync(FIXTURES, "utf8"));

let direct = 0;
let swapped = 0;
let both = 0;
let neither = 0;
const swapSamples: string[] = [];
const directSamples: string[] = [];
const neitherSamples: string[] = [];
const seen = new Set<string>();

for (const fx of fixtures) {
  if (seen.has(fx.driver)) continue;
  const def = lookupDriverByName(fx.driver);
  if (!def) continue;
  seen.add(fx.driver);

  let assembled: ReturnType<typeof decodeTelegram>;
  try {
    const aesKey = fx.key && fx.key !== "NOKEY" ? hexToBytes(fx.key) : null;
    assembled = decodeTelegram(fx.hex, aesKey);
  } catch {
    continue;
  }

  const wire = {
    mfct: assembled.effectiveMfct,
    version: assembled.effectiveVersion,
    type: assembled.effectiveType,
  };
  const directMatch = def.mvt.some(
    (m) => m.manufacturer === wire.mfct && m.version === wire.version && m.type === wire.type,
  );
  const swappedMatch = def.mvt.some(
    (m) => m.manufacturer === wire.mfct && m.version === wire.type && m.type === wire.version,
  );

  const fmt = `m=0x${wire.mfct.toString(16).padStart(4, "0")} v=0x${wire.version.toString(16).padStart(2, "0")} t=0x${wire.type.toString(16).padStart(2, "0")}`;

  if (directMatch && swappedMatch) {
    both++;
  } else if (directMatch) {
    direct++;
    if (directSamples.length < 6) directSamples.push(`  ${fx.driver.padEnd(20)} wire ${fmt}`);
  } else if (swappedMatch) {
    swapped++;
    if (swapSamples.length < 6) swapSamples.push(`  ${fx.driver.padEnd(20)} wire ${fmt}`);
  } else {
    neither++;
    if (neitherSamples.length < 12) {
      const decl = def.mvt
        .map(
          (m) =>
            `m=0x${m.manufacturer.toString(16).padStart(4, "0")} v=0x${m.version.toString(16).padStart(2, "0")} t=0x${m.type.toString(16).padStart(2, "0")}`,
        )
        .join(" | ");
      neitherSamples.push(`  ${fx.driver.padEnd(20)} wire ${fmt}\n      decl: ${decl}`);
    }
  }
}

console.log(`Distinct drivers tested: ${seen.size}`);
console.log(`  direct match (registration is correct):     ${direct}`);
console.log(`  swapped match (need version<->type swap):   ${swapped}`);
console.log(`  both (palindromic — swap doesn't break it): ${both}`);
console.log(`  neither (driver MVT entirely unrelated):    ${neither}`);

if (directSamples.length) {
  console.log("\nDirect samples (already correct):");
  console.log(directSamples.join("\n"));
}
if (swapSamples.length) {
  console.log("\nSwap samples (need swap):");
  console.log(swapSamples.join("\n"));
}
if (neitherSamples.length) {
  console.log("\nNeither samples:");
  console.log(neitherSamples.join("\n"));
}
