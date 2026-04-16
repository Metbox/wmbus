import "../src/drivers/builtin/index.js";
import { listDrivers, lookupDriverByName } from "../src/drivers/registry.js";

console.log("multical602:", lookupDriverByName("multical602")?.name);
console.log("multical302:", lookupDriverByName("multical302")?.name);
console.log("multical403:", lookupDriverByName("multical403")?.name);
console.log("kamheat:", lookupDriverByName("kamheat")?.name);
