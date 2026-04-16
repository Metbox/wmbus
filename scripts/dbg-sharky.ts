import { decodeWmbusHexSync } from "../src/api.js";
import { parseDv } from "../src/data/dv-parser.js";
import { decodeTelegram } from "../src/protocol/pipeline.js";

const hex = "5e44a5115376916140047a0B0050052f2f0c0e829311008c100e000000000c14014938000c2B751400000B3B2902000a5a52070a5e95060a6256000a279015cc020e92831100cc021478113800c2026cdf2c2f2f2f2f2f2f2f2f2f2f2f2f2f";
const assembled = decodeTelegram(hex, null);
console.log("Plaintext:", Buffer.from(assembled.plaintext!).toString("hex"));
const { entries } = parseDv(assembled.plaintext!);
console.log("entries length:", entries.length);
for (const e of entries) {
  const { rawValue, ...rest } = e;
  console.log(rest, "raw=", Buffer.from(rawValue).toString("hex"));
}
console.log("\nDecoded:");
console.log(JSON.stringify(decodeWmbusHexSync(hex, "sharky", "", { name: "Heat", timestampOverride: "1111-11-11T11:11:11Z" }), null, 2));
