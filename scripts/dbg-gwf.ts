import { decodeTelegram } from "../src/protocol/pipeline.js";
const hex = "3144E61E31102220010E8C04F47ABE0420452F2F_037410000004133E0000004413FFFFFFFF426CFFFF0F0120012F2F2F2F2F".replace(/_/g,"");
const a = decodeTelegram(hex, null);
console.log("tplStatus:", a.tplStatus, "plaintext:", a.plaintext ? Buffer.from(a.plaintext).toString("hex") : null);
