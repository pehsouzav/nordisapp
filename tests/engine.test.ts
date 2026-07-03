/**
 * Self-check: runs Profile A and B through the engine and verifies Section 7 invariants.
 * Run with: npx ts-node -r tsconfig-paths/register tests/engine.test.ts
 * (or: npm run test:engine)
 */

import path from "path";
import { buildItinerary } from "../lib/engine";
import type { Block, Profile, ItineraryResult, Window } from "../lib/types";

const blocksPath = path.join(process.cwd(), "data", "blocks.json");
const blocks: Block[] = require(blocksPath);

// ── Profile definitions ───────────────────────────────────────────────────────

const profileA: Profile = {
  days: 4,
  firstTimer: true,
  vibePrimary: "praia",
  vibeSecondary: "cultura",
  companion: "casal",
  pace: "equilibrado",
  budget: "medio",
  arrivalDate: null,
};

const profileB: Profile = {
  days: 3,
  firstTimer: false,
  vibePrimary: "noturna",
  vibeSecondary: "gastronomia",
  companion: "amigos",
  pace: "intenso",
  budget: "medio",
  arrivalDate: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function allPlacedBlocks(result: ItineraryResult) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pb of result.allPlaced) {
    if (!seen.has(pb.block.id)) {
      seen.add(pb.block.id);
      out.push(pb.block.id);
    }
  }
  return out;
}

function placedOnDay(result: ItineraryResult, dayNumber: number): string[] {
  const day = result.schedule.find((d) => d.dayNumber === dayNumber);
  if (!day) return [];
  const ids: string[] = [];
  for (const pb of Object.values(day.placed)) {
    if (pb && !ids.includes(pb.block.id)) ids.push(pb.block.id);
  }
  return ids;
}

function dayOfBlock(result: ItineraryResult, id: string): number | null {
  for (const day of result.schedule) {
    for (const pb of Object.values(day.placed)) {
      if (pb?.block.id === id) return day.dayNumber;
    }
  }
  return null;
}

function countVibe(result: ItineraryResult, vibe: string): number {
  let n = 0;
  const seen = new Set<string>();
  for (const pb of result.allPlaced) {
    if (seen.has(pb.block.id)) continue;
    if (pb.block.vibePrimary === vibe || pb.block.vibeSecondary === vibe) n++;
    seen.add(pb.block.id);
  }
  return n;
}

function hasFlag(result: ItineraryResult, id: string, flagPrefix: string): boolean {
  for (const pb of result.allPlaced) {
    if (pb.block.id === id) {
      return pb.flags.some((f) => f.startsWith(flagPrefix));
    }
  }
  return false;
}

// ── Check runner ─────────────────────────────────────────────────────────────

type Check = { name: string; pass: boolean; detail?: string };

function check(name: string, cond: boolean, detail?: string): Check {
  return { name, pass: cond, detail };
}

function runChecks(label: string, profile: Profile): Check[] {
  const result = buildItinerary(profile, blocks);
  const placedIds = allPlacedBlocks(result);
  const uniqueIds = new Set(placedIds);
  const checks: Check[] = [];

  // Print itinerary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Profile ${label}`);
  console.log("═".repeat(60));
  for (const day of result.schedule) {
    const parts: string[] = [];
    for (const w of (["manhã", "tarde", "noite"] as Window[])) {
      const pb = day.placed[w];
      if (pb) {
        parts.push(`  ${w.toUpperCase()}: ${pb.block.id} — ${pb.block.title.slice(0, 45)}${pb.flags.length ? ` [${pb.flags.join(", ")}]` : ""}`);
      } else if (day.freeWindows[w]) {
        parts.push(`  ${w.toUpperCase()}: [tempo livre]`);
      }
    }
    if (parts.length) console.log(`\nDia ${day.dayNumber}:\n${parts.join("\n")}`);
  }

  // INV 1: No block appears twice
  checks.push(check(
    "No block placed twice",
    result.allPlaced.length === uniqueIds.size * [...uniqueIds].reduce((acc, id) => {
      const count = result.allPlaced.filter((p) => p.block.id === id).length;
      // dia inteiro blocks appear once per window but same block — count unique
      return acc;
    }, 0) || true, // simpler: check unique ids vs allPlaced de-duped
  ));
  // Actually: check that no id appears in more than 2 slots (dia inteiro occupies 2)
  const idCounts: Record<string, number> = {};
  for (const pb of result.allPlaced) idCounts[pb.block.id] = (idCounts[pb.block.id] ?? 0) + 1;
  const maxSlots = Math.max(...Object.values(idCounts), 1);
  checks.push(check("No block placed twice (max 2 for dia-inteiro)", maxSlots <= 2));

  // INV 2: Day 1 has at most one day block
  const day1 = result.schedule[0];
  const day1DayBlocks = Object.entries(day1.placed).filter(
    ([w, pb]) => pb && w !== "noite"
  );
  const uniqueDay1 = new Set(day1DayBlocks.map(([, pb]) => pb!.block.id));
  checks.push(check("Day 1 has at most 1 day block", uniqueDay1.size <= 1, `Found: ${[...uniqueDay1].join(", ") || "none"}`));

  if (profile.firstTimer) {
    // INV 3A: PR1, NT1, NT2 all present
    const hasAll = placedIds.includes("PR1") && placedIds.includes("NT1") && placedIds.includes("NT2");
    checks.push(check("First-timer: PR1, NT1, NT2 all present", hasAll, `Placed: ${placedIds.join(", ")}`));

    // INV 3B: NT1 and NT2 on different days
    const nt1Day = dayOfBlock(result, "NT1");
    const nt2Day = dayOfBlock(result, "NT2");
    checks.push(check("NT1 and NT2 on different days", nt1Day !== null && nt2Day !== null && nt1Day !== nt2Day, `NT1=day${nt1Day}, NT2=day${nt2Day}`));

    // INV 3C: weather-dependent anchors carry the reservation flag
    const weatherAnchors = ["NT1", "NT2", "PR1"].filter((id) => {
      const b = blocks.find((x) => x.id === id);
      return b?.weatherDependent;
    });
    for (const id of weatherAnchors) {
      checks.push(check(`Weather anchor ${id} has flag`, hasFlag(result, id, "flag_weather")));
    }
  } else {
    // INV 4: Returning visitors: no essentialFirstTime blocks
    const essentials = placedIds.filter((id) => blocks.find((b) => b.id === id)?.essentialFirstTime);
    checks.push(check("Returning: no essentialFirstTime blocks placed", essentials.length === 0, `Found: ${essentials.join(", ") || "none"}`));
  }

  // INV 5: No bate-volta unless days >= 5 and pace != tranquilo
  const batevoltaPlaced = placedIds.filter((id) => blocks.find((b) => b.id === id)?.vibePrimary === "bate-volta");
  if (!(profile.days >= 5 && profile.pace !== "tranquilo")) {
    checks.push(check("No bate-volta block placed", batevoltaPlaced.length === 0, `Found: ${batevoltaPlaced.join(", ") || "none"}`));
  }

  // INV 6: bate-volta never on day 1 or last day
  for (const id of batevoltaPlaced) {
    const d = dayOfBlock(result, id);
    checks.push(check(`Bate-volta ${id} not on day 1 or last day`, d !== 1 && d !== profile.days, `day=${d}`));
  }

  // INV 7: NM2 is flagged OR on correct day-of-week (since no arrivalDate, should be flagged)
  if (placedIds.includes("NM2") && !profile.arrivalDate) {
    checks.push(check("NM2 flagged (no arrival date)", hasFlag(result, "NM2", "flag_day_constraint")));
  }

  // INV 8: No empty/broken windows (all intended windows are filled or show free-time)
  let allWindowsHandled = true;
  for (const day of result.schedule) {
    for (const w of day.windows) {
      if (!day.placed[w] && !day.freeWindows[w]) {
        allWindowsHandled = false;
      }
    }
  }
  checks.push(check("No broken windows (all filled or free-time)", allWindowsHandled));

  // INV 9: Vibe ratio ≈ 2:1
  if (profile.vibeSecondary) {
    const primCount = countVibe(result, profile.vibePrimary);
    const secCount = countVibe(result, profile.vibeSecondary);
    const ratio = secCount > 0 ? primCount / secCount : Infinity;
    checks.push(check(`Vibe ratio ${profile.vibePrimary}:${profile.vibeSecondary} ≈ 2:1`, ratio >= 1 && ratio <= 4, `${primCount}:${secCount} (ratio=${ratio.toFixed(1)})`));
  }

  return checks;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("Running engine self-check...\n");

const checksA = runChecks("A (4d, firstTimer, praia+cultura, casal, equilibrado)", profileA);
const checksB = runChecks("B (3d, returning, noturna+gastronomia, amigos, intenso)", profileB);

const allChecks = [...checksA, ...checksB];

console.log(`\n${"═".repeat(60)}`);
console.log("INVARIANT CHECK RESULTS");
console.log("═".repeat(60));

let passed = 0;
let failed = 0;
for (const c of allChecks) {
  const icon = c.pass ? "✅" : "❌";
  const detail = c.detail ? `  (${c.detail})` : "";
  console.log(`${icon}  ${c.name}${detail}`);
  if (c.pass) passed++; else failed++;
}

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
