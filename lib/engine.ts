import type { Block, Profile, Window, DaySchedule, PlacedBlock, ItineraryResult } from "./types";

// Weekday names in Portuguese for constraint matching
const WEEKDAY_NAMES_PT: Record<number, string[]> = {
  0: ["dom", "domingo"],
  1: ["seg", "segunda"],
  2: ["ter", "terça"],
  3: ["qua", "quarta"],
  4: ["qui", "quinta"],
  5: ["sex", "sexta"],
  6: ["sab", "sábado", "sabado"],
};

function dayMatchesConstraint(constraint: string, date: Date): boolean {
  const dow = date.getDay();
  const aliases = WEEKDAY_NAMES_PT[dow] ?? [];
  const lower = constraint.toLowerCase();
  return aliases.some((a) => lower.includes(a));
}

function getWindows(pace: Profile["pace"], hasNightVibe: boolean, dayIndex: number, totalDays: number): Window[] {
  const windows: Window[] = [];
  if (pace === "tranquilo") {
    windows.push("manhã");
    if (hasNightVibe && dayIndex % 2 === 1) windows.push("noite");
  } else if (pace === "equilibrado") {
    windows.push("manhã", "tarde");
    if (hasNightVibe && dayIndex % 2 === 1) windows.push("noite");
  } else {
    windows.push("manhã", "tarde", "noite");
  }
  return windows;
}

function scoreBlock(block: Block, profile: Profile): number {
  let s = 0;
  if (block.vibePrimary === profile.vibePrimary) s += 3;
  if (block.vibePrimary === profile.vibeSecondary || block.vibeSecondary === profile.vibePrimary) s += 2;
  if (profile.vibeSecondary && block.vibeSecondary === profile.vibeSecondary) s += 1;
  if (profile.companion === "solo" && block.fit.includes("solo_friendly")) s += 1;
  if (profile.companion === "familia" && block.fit.includes("kids_ok")) s += 1;
  if (!profile.firstTimer && block.essentialFirstTime) s -= 5;
  return s;
}

function getDateForDay(arrivalDate: string | null, dayIndex: number): Date | null {
  if (!arrivalDate) return null;
  const d = new Date(arrivalDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

// Count placed blocks by vibe
function vibeCounts(placed: PlacedBlock[]): { primary: number; secondary: number } {
  // These will be checked against the profile's vibes at call site
  return { primary: placed.length, secondary: 0 };
}

export function buildItinerary(profile: Profile, blocks: Block[]): ItineraryResult {
  const days = Math.min(profile.days, 6);
  const hasNightVibe =
    profile.vibePrimary === "noturna" || profile.vibeSecondary === "noturna";

  // Build day windows
  const schedule: DaySchedule[] = Array.from({ length: days }, (_, i) => ({
    dayNumber: i + 1,
    windows: getWindows(profile.pace, hasNightVibe, i, days),
    placed: {} as Record<Window, PlacedBlock | null>,
    freeWindows: {} as Record<Window, boolean>,
  }));
  for (const day of schedule) {
    for (const w of day.windows) {
      day.placed[w] = null;
      day.freeWindows[w] = false;
    }
  }

  // ── STEP A: Eligible pool ──────────────────────────────────────────────────
  let pool: Block[] = blocks.map((b) => ({ ...b, _score: 0 }));

  if (!(days >= 5 && profile.pace !== "tranquilo")) {
    pool = pool.filter((b) => b.vibePrimary !== "bate-volta");
  }
  if (profile.companion === "familia") {
    pool = pool.filter((b) => !b.fit.includes("not_kids"));
  }

  // ── STEP B: Score ──────────────────────────────────────────────────────────
  for (const b of pool) {
    (b as Block & { _score: number })._score = scoreBlock(b, profile);
  }

  const allPlaced: PlacedBlock[] = [];

  function place(dayIdx: number, window: Window, block: Block, flags: string[]) {
    const pb: PlacedBlock = { block, flags };
    schedule[dayIdx].placed[window] = pb;
    allPlaced.push(pb);
    pool = pool.filter((b) => b.id !== block.id);
  }

  function getZonaOfDay(dayIdx: number): string | null {
    for (const pb of Object.values(schedule[dayIdx].placed)) {
      if (pb) return pb.block.zona;
    }
    return null;
  }

  function pickCandidate(
    window: Window,
    dayIdx: number,
    excludeIds: Set<string> = new Set()
  ): { block: Block; flags: string[] } | null {
    const dayDate = getDateForDay(profile.arrivalDate ?? null, dayIdx);
    const dayZona = getZonaOfDay(dayIdx);

    // Bate-volta constraints: never day 1 or last day
    const allowBateVolta = dayIdx > 0 && dayIdx < days - 1;

    const candidates = pool.filter((b) => {
      if (excludeIds.has(b.id)) return false;
      if (b.vibePrimary === "bate-volta" && !allowBateVolta) return false;
      if (b.vibePrimary === "bate-volta" && b.zona !== "Fora do Rio") return false;
      if (b.zona === "Fora do Rio" && b.vibePrimary !== "bate-volta") return false;

      // Period match
      if (window === "manhã") {
        if (b.periodo !== "manhã" && b.periodo !== "dia inteiro") return false;
        // dia inteiro needs afternoon also free
        if (b.periodo === "dia inteiro") {
          const hasAfternoon = schedule[dayIdx].windows.includes("tarde");
          if (!hasAfternoon || schedule[dayIdx].placed["tarde"] !== null) return false;
        }
      } else if (window === "tarde") {
        if (b.periodo !== "tarde") return false;
      } else if (window === "noite") {
        if (b.periodo !== "noite") return false;
      }

      return true;
    });

    if (candidates.length === 0) return null;

    // Day-constraint feasibility: if arrivalDate given, filter hard; else flag
    const viable: { block: Block; flags: string[] }[] = [];
    for (const c of candidates) {
      const flags: string[] = [];
      if (c.dayConstraint) {
        if (dayDate) {
          if (!dayMatchesConstraint(c.dayConstraint, dayDate)) continue; // skip incompatible
        } else {
          flags.push(`flag_day_constraint:${c.dayConstraint}`);
        }
      }
      if (c.weatherDependent) {
        flags.push("flag_weather");
      }
      viable.push({ block: c, flags });
    }

    if (viable.length === 0) return null;

    // Scoring with zone clustering bonus + vibe ratio
    const placedPrimary = allPlaced.filter((p) => p.block.vibePrimary === profile.vibePrimary || p.block.vibeSecondary === profile.vibePrimary).length;
    const placedSecondary = profile.vibeSecondary
      ? allPlaced.filter((p) => p.block.vibePrimary === profile.vibeSecondary || p.block.vibeSecondary === profile.vibeSecondary).length
      : 0;
    const targetRatio = 2;
    const secondaryBehind =
      profile.vibeSecondary &&
      placedSecondary * targetRatio < placedPrimary;

    viable.sort((a, b) => {
      const sa = (a.block as Block & { _score: number })._score;
      const sb = (b.block as Block & { _score: number })._score;

      // Zone clustering bonus
      const za = dayZona && a.block.zona === dayZona ? 4 : 0;
      const zb = dayZona && b.block.zona === dayZona ? 4 : 0;

      // Vibe ratio nudge: if secondary is behind its 2:1 target, prefer secondary blocks
      const ra =
        secondaryBehind && (a.block.vibePrimary === profile.vibeSecondary || a.block.vibeSecondary === profile.vibeSecondary)
          ? 2
          : 0;
      const rb =
        secondaryBehind && (b.block.vibePrimary === profile.vibeSecondary || b.block.vibeSecondary === profile.vibeSecondary)
          ? 2
          : 0;

      return sb + zb + rb - (sa + za + ra);
    });

    return viable[0];
  }

  // ── STEP C: Place first-timer anchors ─────────────────────────────────────
  if (profile.firstTimer) {
    const anchors = pool
      .filter((b) => b.essentialFirstTime)
      .sort((a, b) => (b.weatherDependent ? 1 : 0) - (a.weatherDependent ? 1 : 0));

    const weatherDayUsed = new Set<number>();

    for (const anchor of anchors) {
      const flags: string[] = [];
      if (anchor.weatherDependent) flags.push("flag_weather");

      // period: PR1 is tarde, NT1 is manhã, NT2 is tarde
      const targetWindow: Window =
        anchor.periodo === "manhã" ? "manhã" : anchor.periodo === "tarde" ? "tarde" : "noite";

      // Place earliest from day index 1 (day 2) onward
      let placed = false;
      for (let d = 1; d < days; d++) {
        if (!schedule[d].windows.includes(targetWindow)) continue;
        if (schedule[d].placed[targetWindow] !== null) continue;
        if (anchor.weatherDependent && weatherDayUsed.has(d)) continue;
        place(d, targetWindow, anchor, flags);
        if (anchor.weatherDependent) weatherDayUsed.add(d);
        placed = true;
        break;
      }
      if (!placed) {
        // fallback: day 0 (day 1) if no room found later
        if (schedule[0].windows.includes(targetWindow) && schedule[0].placed[targetWindow] === null) {
          place(0, targetWindow, anchor, flags);
        }
      }
    }
  }

  // ── STEP D: Day 1 — one light block max ───────────────────────────────────
  const day1Windows: Window[] = schedule[0].windows.filter(
    (w) => schedule[0].placed[w] === null
  );
  const nonNightWindows = day1Windows.filter((w) => w !== "noite");

  if (nonNightWindows.length > 0) {
    const w = nonNightWindows[0];
    // Prefer ZS, not weatherDependent
    const day1Candidates = pool
      .filter((b) => {
        if (b.periodo !== w) return false;
        if (b.vibePrimary === "bate-volta") return false;
        if (b.zona === "Fora do Rio") return false;
        return true;
      })
      .sort((a, b) => {
        const scoreA = (a as Block & { _score: number })._score + (a.zona === "Zona Sul" ? 2 : 0) + (!a.weatherDependent ? 1 : 0);
        const scoreB = (b as Block & { _score: number })._score + (b.zona === "Zona Sul" ? 2 : 0) + (!b.weatherDependent ? 1 : 0);
        return scoreB - scoreA;
      });

    if (day1Candidates.length > 0) {
      const flags: string[] = [];
      if (day1Candidates[0].weatherDependent) flags.push("flag_weather");
      place(0, w, day1Candidates[0], flags);
    }
    // Mark remaining non-night day-1 windows as free time (cap at 1 block)
    for (const remaining of nonNightWindows.slice(1)) {
      schedule[0].freeWindows[remaining] = true;
    }
  }

  // Unlock day-1 night if applicable
  // (night window on day 1 is still fillable by step E)

  // ── STEP E: Fill remaining windows ────────────────────────────────────────
  for (let d = 0; d < days; d++) {
    for (const w of schedule[d].windows) {
      // Skip already placed
      if (schedule[d].placed[w] !== null) continue;
      // Skip windows marked free
      if (schedule[d].freeWindows[w]) continue;
      // Day 1 only gets 1 day block (nights OK)
      if (d === 0 && w !== "noite") continue;

      const result = pickCandidate(w, d);
      if (result) {
        place(d, w, result.block, result.flags);
        // If dia inteiro, also mark tarde as placed (same block)
        if (result.block.periodo === "dia inteiro" && w === "manhã") {
          schedule[d].placed["tarde"] = { block: result.block, flags: result.flags };
        }
      } else {
        schedule[d].freeWindows[w] = true;
      }
    }
  }

  // ── STEP F: Attach always-on layers ───────────────────────────────────────
  const placedIds = new Set(allPlaced.map((p) => p.block.id));

  const antiFurada = allPlaced
    .filter((p) => p.block.trap || p.block.fairPrice)
    .map((p) => ({
      blockId: p.block.id,
      title: p.block.title,
      trap: p.block.trap,
      fairPrice: p.block.fairPrice,
    }));

  const zonaSet = new Set(allPlaced.map((p) => p.block.zona));

  return {
    days,
    schedule,
    allPlaced,
    antiFurada,
    rioAgoraKey: "rio_agora",
    segurancaZonas: Array.from(zonaSet),
    logisticaBlockIds: Array.from(placedIds),
    budgetBannerKey: profile.budget ?? "medio",
    profile,
  };
}
