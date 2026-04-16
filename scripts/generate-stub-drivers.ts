// Generate stub drivers for every seed driver that isn't yet registered.
//
// Each stub:
//   - correct name + aliases
//   - correct meterType
//   - correct MVT triples
//   - library fields picked per meterType (total_m3/total_kwh/etc.)
//   - status field with BitToString + "OK" default
//
// These stubs register the driver name so the registry responds to lookups
// and listWmbusDrivers() includes them. Field extraction is best-effort —
// specialised fields + mfct-specific quirks aren't ported here.
//
// Run with: npx tsx scripts/generate-stub-drivers.ts

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const CC_DIR = join(REPO, "vendor", "wmbusmeters@af48083", "src");
const XMQ_DIR = join(REPO, "vendor", "wmbusmeters@af48083", "drivers", "src");
const BUILTIN = join(REPO, "src", "drivers", "builtin");

interface MVT {
  mfct: string;
  version: number;
  type: number;
  rawCode?: number;
}
interface Meta {
  name: string;
  meterType: string;
  aliases: string[];
  mvts: MVT[];
}

function parseCc(path: string): Meta | null {
  const c = readFileSync(path, "utf8");
  const n = /di\.setName\("([^"]+)"\)/.exec(c);
  if (!n) return null;
  const t = /di\.setMeterType\(MeterType::(\w+)\)/.exec(c);
  const aliases = [...c.matchAll(/di\.addNameAlias\("([^"]+)"\)/g)].map((m) => m[1] as string);
  const mvts: MVT[] = [];
  for (const m of c.matchAll(
    /di\.addMVT\(MANUFACTURER_(\w+),\s*0x([0-9a-fA-F]+),\s*0x([0-9a-fA-F]+)\)/g,
  )) {
    mvts.push({
      mfct: m[1] as string,
      version: Number.parseInt(m[2] as string, 16),
      type: Number.parseInt(m[3] as string, 16),
    });
  }
  // Handle raw-hex manufacturer codes (`di.addMVT(0x8614, ...)`).
  for (const m of c.matchAll(
    /di\.addMVT\(0x([0-9a-fA-F]+)[^,]*,\s*0x([0-9a-fA-F]+),\s*0x([0-9a-fA-F]+)\)/g,
  )) {
    mvts.push({
      mfct: "",
      rawCode: Number.parseInt(m[1] as string, 16),
      version: Number.parseInt(m[2] as string, 16),
      type: Number.parseInt(m[3] as string, 16),
    });
  }
  return { name: n[1] as string, meterType: t?.[1] ?? "Unknown", aliases, mvts };
}

function parseXmq(path: string): Meta | null {
  const c = readFileSync(path, "utf8");
  const n = /\bname\s*=\s*(\S+)/.exec(c);
  if (!n) return null;
  const t = /\bmeter_type\s*=\s*(\w+)/.exec(c);
  const aliasesMatch = /\baliases\s*=\s*([^\n]+)/.exec(c);
  const aliases = aliasesMatch
    ? (aliasesMatch[1] as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const mvts: MVT[] = [];
  for (const m of c.matchAll(/\bmvt\s*=\s*(\w{3}),\s*([0-9a-fA-F]+),\s*([0-9a-fA-F]+)/g)) {
    mvts.push({
      mfct: m[1] as string,
      version: Number.parseInt(m[2] as string, 16),
      type: Number.parseInt(m[3] as string, 16),
    });
  }
  return { name: n[1] as string, meterType: t?.[1] ?? "Unknown", aliases, mvts };
}

// ---- Templates ----

function libraryFieldsFor(meterType: string): string[] {
  switch (meterType) {
    case "WaterMeter":
      return ["total_m3", "meter_datetime"];
    case "HeatMeter":
    case "HeatCoolingMeter":
      return ["meter_datetime", "flow_temperature_c", "return_temperature_c", "volume_flow_m3h"];
    case "ElectricityMeter":
      return ["meter_datetime"];
    case "GasMeter":
      return ["total_m3", "meter_datetime"];
    case "HeatCostAllocationMeter":
      return ["consumption_hca", "target_hca", "target_date", "meter_datetime"];
    default:
      return ["meter_datetime"];
  }
}

function defaultFieldsFor(meterType: string): string {
  switch (meterType) {
    case "WaterMeter":
      return "name,id,total_m3,status,timestamp";
    case "HeatMeter":
    case "HeatCoolingMeter":
      return "name,id,total_kwh,total_volume_m3,status,timestamp";
    case "ElectricityMeter":
      return "name,id,total_energy_consumption_kwh,status,timestamp";
    case "GasMeter":
      return "name,id,total_m3,status,timestamp";
    case "HeatCostAllocationMeter":
      return "name,id,consumption_hca,status,timestamp";
    default:
      return "name,id,status,timestamp";
  }
}

function extraFieldsFor(meterType: string): string {
  switch (meterType) {
    case "HeatMeter":
    case "HeatCoolingMeter":
      return `
    {
      kind: "numeric",
      name: "total",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume of heating media.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },`;
    case "ElectricityMeter":
      return `
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },`;
    default:
      return "";
  }
}

function mvtToTs(v: MVT): string {
  if (v.rawCode !== undefined) {
    return `{ manufacturer: 0x${v.rawCode.toString(16)}, version: 0x${v.version.toString(16).padStart(2, "0")}, type: 0x${v.type.toString(16).padStart(2, "0")} }`;
  }
  return `{ manufacturer: flagToManufacturer("${v.mfct}"), version: 0x${v.version.toString(16).padStart(2, "0")}, type: 0x${v.type.toString(16).padStart(2, "0")} }`;
}

function linkModesFor(meterType: string): string {
  switch (meterType) {
    case "HeatMeter":
    case "HeatCoolingMeter":
      return '["C1", "T1"]';
    default:
      return '["T1"]';
  }
}

function generate(m: Meta): string {
  const aliases =
    m.aliases.length > 0 ? `\n  aliases: [${m.aliases.map((a) => `"${a}"`).join(", ")}],` : "";
  const libFields = libraryFieldsFor(m.meterType);
  const libArr = libFields.length > 0 ? `[${libFields.map((f) => `"${f}"`).join(", ")}]` : "[]";
  const mvtLines = m.mvts.map((v) => `    ${mvtToTs(v)},`).join("\n");
  const extras = extraFieldsFor(m.meterType);
  return `// ${m.name} — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const ${safeIdent(m.name)} = defineDriver({
  name: "${m.name}",${aliases}
  meterType: "${m.meterType}",
  linkModes: ${linkModesFor(m.meterType)},
  mvt: [
${mvtLines}
  ],
  defaultFields: "${defaultFieldsFor(m.meterType)}",
  libraryFields: ${libArr},
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },${extras}
  ],
});
`;
}

function safeIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

// ---- Main ----

const all: Record<string, Meta> = {};
for (const f of readdirSync(CC_DIR)) {
  if (!f.startsWith("driver_") || !f.endsWith(".cc")) continue;
  const m = parseCc(join(CC_DIR, f));
  if (m) all[m.name] = m;
}
for (const f of readdirSync(XMQ_DIR)) {
  if (!f.endsWith(".xmq")) continue;
  const m = parseXmq(join(XMQ_DIR, f));
  if (m && !all[m.name]) all[m.name] = m;
}

const ALREADY_DONE = new Set(
  readdirSync(BUILTIN)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, "")),
);

// Seed driver names Metbox actually references.
const SEED =
  `aerius abbb23 amiplus apator08 apator162 apator172 apatoreitn apatorna1 aquastream aventieshca aventieswm bfw240radio c5isf compact5 dme173 dme_07 ebzwmbe ehzp elf elf2 elster eltako em24 emerlin868 enercal esyswm eurisii ev200 evo868 fhkvdataiii fhkvdataiv fiowater flowiq2200 gransystems gwfwater hcae2 hydrocalm3 hydrocalm4 hydroclima hydroclimav2 hydrodigit hydrus iem3000 ime iperl istaheat itron itronheat iwmtx5 izar janz kaden kamheat kampress maddalena mkradio3 mkradio3a mkradio4 mkradio4a multical21 nemo nzr omnipower op041a picoflux pollucomf q400 qcaloric qheat qheat_55_us qheatv2 qualcosonic qwater qwaterv2 relhca rfmtx1 sensostar sharky sharky774 sharky775 sontex868 supercal supercom587 topaseskr ultraheat ultrimis unismart vario411 vario451 vario451mid waterstarm watertech weh_07 werhlemodwm wme5 zenner0b`.split(
    " ",
  );

let generated = 0;
let skipped = 0;
const missing: string[] = [];

for (const name of SEED) {
  if (ALREADY_DONE.has(safeIdent(name))) {
    skipped++;
    continue;
  }
  const meta = all[name];
  if (!meta || meta.mvts.length === 0) {
    missing.push(name);
    continue;
  }
  const file = join(BUILTIN, `${safeIdent(name)}.ts`);
  writeFileSync(file, generate(meta), "utf8");
  generated++;
  console.log(`  gen ${name} (${meta.meterType}, ${meta.mvts.length} MVTs)`);
}

console.log();
console.log(`Generated: ${generated}`);
console.log(`Already done: ${skipped}`);
console.log(`Missing (no MVTs upstream): ${missing.length}: ${missing.join(", ")}`);

// Auto-update builtin/index.ts to import everything in this directory.
const newImports = readdirSync(BUILTIN)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .sort()
  .map((f) => `import "./${f.replace(/\.ts$/, ".js")}";`);

const indexContent = `// Side-effect import of every built-in driver. Importing this module
// registers all bundled drivers with the global registry.
//
// Auto-generated section below: scripts/generate-stub-drivers.ts re-builds
// this on demand. Hand-maintained driver files live in this directory and
// register themselves via defineDriver().

${newImports.join("\n")}
`;
writeFileSync(join(BUILTIN, "index.ts"), indexContent, "utf8");
console.log(`\nRewrote ${join(BUILTIN, "index.ts")} with ${newImports.length} imports.`);

execSync("npm run format > /dev/null 2>&1", { cwd: REPO });
