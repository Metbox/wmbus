import { decodeWmbusHexSync } from "../src/api.js";
import { parseDv } from "../src/data/dv-parser.js";
import { decodeTelegram } from "../src/protocol/pipeline.js";

const hex = "344465325566366018087A90040000046D1311962C01FD0C03326CFFFF01FD7300025AC2000DFF5F0C0008003030810613080BFFFC";
const assembled = decodeTelegram(hex, null);
console.log("Plaintext:", Buffer.from(assembled.plaintext!).toString("hex"));
const { entries } = parseDv(assembled.plaintext!);
console.log("entries length:", entries.length);
for (const e of entries) {
  const { rawValue, ...rest } = e;
  console.log(rest, "raw=", Buffer.from(rawValue).toString("hex"));
}
console.log("\nDecoded:");
console.log(JSON.stringify(decodeWmbusHexSync(hex, "qcaloric", "", { name: "HCA2", timestampOverride: "1111-11-11T11:11:11Z" }), null, 2));
