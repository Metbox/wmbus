// Live demo of @metbox/wmbus decoding real wM-Bus telegrams from upstream
// fixtures. Run with: npx tsx scripts/demo-decode.ts

import {
  decodeWmbusHex,
  listWmbusDrivers,
  registerCustomDriver,
  type WMBusDecodeResult,
} from "../src/api.js";

interface Demo {
  label: string;
  driver: string;
  name: string;
  hex: string;
  key?: string;
  notes?: string;
}

const TEST_TIMESTAMP = "2026-04-15T17:00:00Z";

const DEMOS: Demo[] = [
  {
    label: "Kamstrup Multical21 water meter (NOKEY, ELL-II flagged AES_CTR but plaintext)",
    driver: "multical21",
    name: "MyTapWater",
    hex: "2A442D2C998734761B168D2091D37CAC21576C78_02FF207100041308190000441308190000615B7F616713",
  },
  {
    label: "Multical21 second fixture (Vadden) — different status, max_flow",
    driver: "multical21",
    name: "Vadden",
    hex: "2D442D2C776655441B168D2083B48D3A20_46887802FF20000004132F4E000092013B3D01A1015B028101E7FF0F03",
  },
  {
    label: "Sensus iPerl T1 water meter",
    driver: "iperl",
    name: "MoreWater",
    hex: "1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F",
  },
  {
    label: "Aventies water meter — Mode-5 AES-CBC-IV decryption with 32-hex key",
    driver: "aventieswm", // not yet ported as a real driver — auto fallback
    name: "Votten",
    key: "A004EB23329A477F1DD2D7820B56EB3D",
    hex: "76442104710007612507727100076121042507B5006005E2E95A3C2A1279A5415E6732679B43369FD5FDDDD783EEEBB48236D34E7C94AF0A18A5FDA5F7D64111EB42D4D891622139F2952F9D12A20088DFA4CF8123871123EE1F6C1DCEA414879DDB4E05E508F1826D7EFBA6964DF804C9261EA23BBF03",
    notes:
      "Driver 'aventieswm' isn't ported yet → falls through to 'auto' which still decrypts the body and exposes the effective id/media; full field extraction would land with a real driver.",
  },
  {
    label: "Diehl Sharky 775 ultrasonic heat meter — Mode-5 AES, 12 fields",
    driver: "sharky775",
    name: "Sharky775",
    key: "51728910e66d83f851728910e66d83f8",
    hex: "5e44a5118400136940047a1c005005108e922dd046fa150bc2cbaefc4565a9d00ec6e948b2659111cf25179bb5e37841b8bec8f8965033e7222832f92d6037cba40acbbfa8e3a122c82a6e9ba3af672a6f9016a964adec9b74de47f8d26c2f",
  },
  {
    label: "Aquastream water meter — Mode-5 AES, battery in years (force-scale 1/365)",
    driver: "aquastream",
    name: "AqWater",
    hex: "4644B42557920410050E7237329305B42501075B0030252F2F_04130342000084101300000000046D0D30F62B441349180000426CFF2A02FD17000002FD74DB152F2F2F2F2F2F2F2F2F2F2F2F2F",
  },
  {
    label: "Maddalena water meter — fabrication_no, target_date, multi-storage",
    driver: "maddalena",
    name: "mywater",
    hex: "4E4424349986012401077AF2000020_2F2F0413A7000000046D0E0C163B04FD17000000000E789986012401FF441300000000426C01018401134A00000082016C1F3AD3013B470500C4016D1B14153B",
  },
  {
    label: "QCaloric heat cost allocator — multi-storage HCA values",
    driver: "qcaloric",
    name: "MyElement",
    hex: "314493441234567835087a740000200b6e2701004b6e450100426c5f2ccb086e790000c2086c7f21326cffff046d200b7422",
  },
  {
    label: "Supercom587 — software_version BCD-decoded as '010002'",
    driver: "supercom587",
    name: "MyWarmWater",
    hex: "A244EE4D785634123C067A8F000000_0C1348550000426CE1F14C130000000082046C21298C0413330000008D04931E3A3CFE3300000033000000330000003300000033000000330000003300000033000000330000003300000033000000330000004300000034180000046D0D0B5C2B03FD6C5E150082206C5C290BFD0F0200018C4079678885238310FD3100000082106C01018110FD610002FD66020002FD170000",
  },
  {
    label: "Auto-driver: unknown meter falls back to minimal output",
    driver: "auto",
    name: "Unknown",
    hex: "1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F",
    notes:
      "Same iPerl telegram, but with driver='auto' the registry resolves the MVT to iperl automatically.",
  },
  {
    label: "Encrypted telegram with WRONG key → epoch-timestamp sentinel",
    driver: "sharky775",
    name: "Sharky775",
    key: "00000000000000000000000000000000",
    hex: "5e44a5118400136940047a1c005005108e922dd046fa150bc2cbaefc4565a9d00ec6e948b2659111cf25179bb5e37841b8bec8f8965033e7222832f92d6037cba40acbbfa8e3a122c82a6e9ba3af672a6f9016a964adec9b74de47f8d26c2f",
    notes:
      "Wrong key → my pipeline emits timestamp='1970-01-01T00:00:00Z' which Metbox's retry-with-key path uses as the trigger to look up the configured wmbusKey.",
  },
  {
    label: "Encrypted telegram with NO key → missing-key sentinel",
    driver: "sharky775",
    name: "Sharky775",
    hex: "5e44a5118400136940047a1c005005108e922dd046fa150bc2cbaefc4565a9d00ec6e948b2659111cf25179bb5e37841b8bec8f8965033e7222832f92d6037cba40acbbfa8e3a122c82a6e9ba3af672a6f9016a964adec9b74de47f8d26c2f",
  },
];

// ---------- Custom-driver demo ----------

interface CustomDriverDemo {
  label: string;
  hex: string;
  name: string;
}

function registerCustomMeter(): CustomDriverDemo {
  // Pretend we want to support a totally new manufacturer Metbox doesn't
  // have a driver for. Register at runtime — no rebuild needed.
  registerCustomDriver({
    name: "metbox_custom_water",
    meterType: "WaterMeter",
    linkModes: ["T1"],
    mvt: [{ manufacturer: 0xae4c, version: 0x68, type: 0x07 }],
    fields: [
      {
        kind: "numeric",
        name: "total",
        description: "Total water consumption.",
        quantity: "Volume",
        scaling: "Auto",
        signedness: "Signed",
        match: { measurementType: "Instantaneous", vifRange: "Volume" },
      },
    ],
  });
  return {
    label: "Custom user-defined driver (registered at runtime, no rebuild)",
    hex: "1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F",
    name: "FactoryFloor",
  };
}

// ---------- Pretty-printer ----------

function header(s: string): void {
  console.log(`\n\x1b[1;36m${s}\x1b[0m`);
  console.log("─".repeat(s.length));
}

function showResult(label: string, result: WMBusDecodeResult, notes?: string): void {
  console.log(`\n\x1b[1;33m▶\x1b[0m \x1b[1m${label}\x1b[0m`);
  if (notes) console.log(`  \x1b[2m${notes}\x1b[0m`);
  // Indent JSON for readability.
  const json = JSON.stringify(result, null, 2)
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
  console.log(json);
}

// ---------- Run ----------

async function main(): Promise<void> {
  header("@metbox/wmbus — live decode demo");

  const drivers = await listWmbusDrivers();
  console.log(`Registered driver names: \x1b[32m${drivers.length}\x1b[0m`);
  console.log(`  ${drivers.filter((d) => d !== "auto").join(", ")}`);

  for (const demo of DEMOS) {
    const result = await decodeWmbusHex(demo.hex, demo.driver, demo.key ?? "", {
      name: demo.name,
      timestampOverride: TEST_TIMESTAMP,
    });
    showResult(demo.label, result, demo.notes);
  }

  // Custom driver path.
  const custom = registerCustomMeter();
  const customResult = await decodeWmbusHex(custom.hex, "metbox_custom_water", "", {
    name: custom.name,
    timestampOverride: TEST_TIMESTAMP,
  });
  showResult(custom.label, customResult);

  console.log("\n─".repeat(60));
  console.log("\x1b[32m✓\x1b[0m All decodes completed.");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
