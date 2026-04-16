import { decodeWmbusHexSync } from "../src/api.js";
import { parseDv } from "../src/data/dv-parser.js";
import { decodeTelegram } from "../src/protocol/pipeline.js";

const hex = "6874746808007257575757496A000712000000_0C7857575757046D2414DE280413000000000C943C000000004413FFFFFFFF426CFFFF840113FFFFFFFF82016CFFFFC40113FFFFFFFFC2016CFFFF840213FFFFFFFF82026CFFFF043B000000000422E62F000004260000000034220000000002FD1700001F5716".replace(/_/g,"");
const assembled = decodeTelegram(hex, null);
console.log("Plaintext:", Buffer.from(assembled.plaintext!).toString("hex"));
const { entries } = parseDv(assembled.plaintext!);
for (const e of entries) {
  const { rawValue, ...rest } = e;
  console.log(rest, "raw=", Buffer.from(rawValue).toString("hex"));
}
console.log("\nDecoded:", JSON.stringify(decodeWmbusHexSync(hex, "minomess", "", { name: "Minowired", idOverride: "57575757", timestampOverride: "1111-11-11T11:11:11Z" }), null, 2));
