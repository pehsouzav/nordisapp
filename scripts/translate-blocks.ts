/**
 * npm run translate
 *
 * Translates content/trap/fairPrice fields of blocks.json from PT → EN
 * using Claude (Anthropic API). Idempotent: skips fields whose hash matches
 * the cached translation so we never re-translate unchanged content.
 *
 * Requires: ANTHROPIC_API_KEY env var (build-time only, never shipped to client).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

const DATA_DIR = path.join(process.cwd(), "data");
const BLOCKS_PT = path.join(DATA_DIR, "blocks.json");
const BLOCKS_EN = path.join(DATA_DIR, "blocks.en.json");
const HASHES_FILE = path.join(DATA_DIR, ".translation-hashes.json");

const TRANSLATION_PROMPT = `You are translating short Rio de Janeiro travel-guide snippets from Brazilian Portuguese into natural, friendly English for international travelers. Keep it concise and punchy and match the original tone — do not pad. DO NOT translate proper nouns or culturally specific terms; keep them in Portuguese, optionally adding a 2–3 word English gloss in parentheses on first mention. This includes place names (e.g. Pão de Açúcar, Cristo Redentor, Lapa, Arpoador, Pedra do Sal, Santa Teresa) and cultural terms (boteco, roda de samba, caipirinha, chope, açaí, carioca). Keep every price in R$ exactly as written. Return strict JSON only, no preamble: {"content":"...","trap":"...","fairPrice":"..."}`;

type Block = {
  id: string;
  title: string;
  vibePrimary: string;
  vibeSecondary: string | null;
  zona: string;
  periodo: string;
  essentialFirstTime: boolean;
  weatherDependent: boolean;
  dayConstraint: string | null;
  fit: string[];
  content: string;
  trap: string;
  fairPrice: string;
};

function hash(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

function needsTranslation(
  block: Block,
  hashes: Record<string, string>,
  enBlocks: Record<string, Block>
): boolean {
  const fields = ["content", "trap", "fairPrice"] as const;
  for (const field of fields) {
    const ptText = block[field];
    const h = hash(ptText);
    const cacheKey = `${block.id}.${field}`;
    if (hashes[cacheKey] !== h) return true;
    if (!enBlocks[block.id]?.[field] && ptText) return true; // en value missing
  }
  return false;
}

async function translateBlock(
  client: Anthropic,
  block: Block
): Promise<{ content: string; trap: string; fairPrice: string }> {
  const userContent = JSON.stringify({
    content: block.content,
    trap: block.trap,
    fairPrice: block.fairPrice,
  });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${TRANSLATION_PROMPT}\n\nTranslate this:\n${userContent}`,
      },
    ],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(jsonStr);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌  ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const ptBlocks: Block[] = JSON.parse(fs.readFileSync(BLOCKS_PT, "utf8"));
  const existingEn: Block[] = fs.existsSync(BLOCKS_EN)
    ? JSON.parse(fs.readFileSync(BLOCKS_EN, "utf8"))
    : [];
  const hashes: Record<string, string> = fs.existsSync(HASHES_FILE)
    ? JSON.parse(fs.readFileSync(HASHES_FILE, "utf8"))
    : {};

  const enByID: Record<string, Block> = {};
  for (const b of existingEn) enByID[b.id] = b;

  const enBlocks: Block[] = [];
  let translated = 0;
  let skipped = 0;

  for (const ptBlock of ptBlocks) {
    const enBlock: Block = {
      ...ptBlock, // copy id, enums, tags
      content: enByID[ptBlock.id]?.content ?? "",
      trap: enByID[ptBlock.id]?.trap ?? "",
      fairPrice: enByID[ptBlock.id]?.fairPrice ?? "",
    };

    if (needsTranslation(ptBlock, hashes, enByID)) {
      process.stdout.write(`  Translating ${ptBlock.id} (${ptBlock.title.slice(0, 40)})... `);
      try {
        const result = await translateBlock(client, ptBlock);
        enBlock.content = result.content;
        enBlock.trap = result.trap;
        enBlock.fairPrice = result.fairPrice;
        // Update hashes
        for (const field of ["content", "trap", "fairPrice"] as const) {
          hashes[`${ptBlock.id}.${field}`] = hash(ptBlock[field]);
        }
        console.log("✓");
        translated++;
      } catch (err) {
        console.log(`❌  failed: ${err}`);
        // Keep whatever we had
        enBlock.content = enByID[ptBlock.id]?.content ?? ptBlock.content;
        enBlock.trap = enByID[ptBlock.id]?.trap ?? ptBlock.trap;
        enBlock.fairPrice = enByID[ptBlock.id]?.fairPrice ?? ptBlock.fairPrice;
      }
    } else {
      enBlock.content = enByID[ptBlock.id]?.content ?? "";
      enBlock.trap = enByID[ptBlock.id]?.trap ?? "";
      enBlock.fairPrice = enByID[ptBlock.id]?.fairPrice ?? "";
      skipped++;
    }

    enBlocks.push(enBlock);
  }

  fs.writeFileSync(BLOCKS_EN, JSON.stringify(enBlocks, null, 2), "utf8");
  fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2), "utf8");

  console.log(`\nDone. Translated: ${translated}, Skipped (cached): ${skipped}`);
  console.log(`→ ${BLOCKS_EN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
