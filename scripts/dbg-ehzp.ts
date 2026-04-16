import { decodeWmbusHexSync } from "../src/api.js";
import { parseDv } from "../src/data/dv-parser.js";
import { decodeTelegram } from "../src/protocol/pipeline.js";

const hex = "5344A8159955995502028C201D900F002C250C390000ED176BBBB1591ADB7A1D003007102F2F_0700583B74020000000007803CBCD70200000000000728B070200000000000042092A406002F2F2F2F2F2F2F2F2F".replace(/_/g,"");
const assembled = decodeTelegram(hex, null);
console.log("Plaintext:", Buffer.from(assembled.plaintext!).toString("hex"));
const { entries } = parseDv(assembled.plaintext!);
console.log("entries length:", entries.length);
for (const e of entries) {
  const { rawValue, ...rest } = e;
  console.log(rest, "raw=", Buffer.from(rawValue).toString("hex"));
}
console.log("\nDecoded:", JSON.stringify(decodeWmbusHexSync(hex, "ehzp", "", { name: "Elen3", idOverride: "55995599", timestampOverride: "1111-11-11T11:11:11Z" }), null, 2));
