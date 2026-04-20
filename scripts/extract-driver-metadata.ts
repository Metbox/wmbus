// One-shot helper: extract meter_type + MVTs + link modes from every upstream
// driver source (both static .cc and .xmq) so the remaining Phase-6 stubs can
// be generated mechanically.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const CC_DIR = join(REPO, "vendor", "wmbusmeters@af48083", "src");
const XMQ_DIR = join(REPO, "vendor", "wmbusmeters@af48083", "drivers", "src");

interface Meta {
  name: string;
  source: string;
  meterType: string | null;
  aliases: string[];
  mvts: Array<{ mfct: string; version: number; type: number }>;
  linkModes: string[];
}

function parseCcDriver(path: string, filename: string): Meta | null {
  const content = readFileSync(path, "utf8");
  const nameMatch = /di\.setName\("([^"]+)"\)/.exec(content);
  if (!nameMatch) return null;
  const typeMatch = /di\.setMeterType\(MeterType::(\w+)\)/.exec(content);
  const aliases = [...content.matchAll(/di\.addNameAlias\("([^"]+)"\)/g)].map((m) => m[1] ?? "");
  const linkModes = [...content.matchAll(/di\.addLinkMode\(LinkMode::(\w+)\)/g)].map(
    (m) => m[1] ?? "",
  );
  // Upstream signature is `addMVT(uint16_t mfct, uchar type, uchar ver)` —
  // see vendor/.../src/meters.h:192. The 2nd positional arg is TYPE.
  const mvts = [
    ...content.matchAll(
      /di\.addMVT\(MANUFACTURER_(\w+),\s*0x([0-9a-fA-F]+),\s*0x([0-9a-fA-F]+)\)/g,
    ),
  ].map((m) => ({
    mfct: m[1] ?? "",
    type: Number.parseInt(m[2] ?? "0", 16),
    version: Number.parseInt(m[3] ?? "0", 16),
  }));
  return {
    name: nameMatch[1] ?? "",
    source: filename,
    meterType: typeMatch?.[1] ?? null,
    aliases,
    mvts,
    linkModes,
  };
}

function parseXmqDriver(path: string, filename: string): Meta | null {
  const content = readFileSync(path, "utf8");
  const nameMatch = /\bname\s*=\s*(\S+)/.exec(content);
  if (!nameMatch) return null;
  const typeMatch = /\bmeter_type\s*=\s*(\w+)/.exec(content);
  const aliasesMatch = /\baliases\s*=\s*([^\n]+)/.exec(content);
  const aliases = aliasesMatch
    ? (aliasesMatch[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const mvts = [
    ...content.matchAll(/\bmvt\s*=\s*(\w{3}),\s*([0-9a-fA-F]+),\s*([0-9a-fA-F]+)/g),
  ].map((m) => ({
    mfct: m[1] ?? "",
    version: Number.parseInt(m[2] ?? "0", 16),
    type: Number.parseInt(m[3] ?? "0", 16),
  }));
  return {
    name: nameMatch[1] ?? "",
    source: filename,
    meterType: typeMatch?.[1] ?? null,
    aliases,
    mvts,
    linkModes: [],
  };
}

const all: Record<string, Meta> = {};

for (const f of readdirSync(CC_DIR)) {
  if (!f.startsWith("driver_") || !f.endsWith(".cc")) continue;
  const m = parseCcDriver(join(CC_DIR, f), f);
  if (m?.name) all[m.name] = m;
}
for (const f of readdirSync(XMQ_DIR)) {
  if (!f.endsWith(".xmq")) continue;
  const m = parseXmqDriver(join(XMQ_DIR, f), f);
  if (m?.name && !all[m.name]) all[m.name] = m;
}

console.log(JSON.stringify(all, null, 2));
