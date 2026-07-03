"use client";

import { useState, useEffect } from "react";
import IntakeForm from "@/components/IntakeForm";
import ItineraryView from "@/components/ItineraryView";
import { buildItinerary } from "@/lib/engine";
import type { Profile, ItineraryResult, Lang } from "@/lib/types";
import blocksData from "@/data/blocks.json";

export default function Home() {
  const [lang, setLang] = useState<Lang>("pt");
  const [result, setResult] = useState<ItineraryResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rio_lang") as Lang | null;
    if (stored === "en" || stored === "pt" || stored === "es") {
      setLang(stored);
    } else {
      const nav = navigator.language?.toLowerCase() ?? "";
      if (nav.startsWith("en")) setLang("en");
      else if (nav.startsWith("es")) setLang("es");
    }
  }, []);

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem("rio_lang", l);
  }

  async function handleSubmit(profile: Profile) {
    // Load the correct language block file
    let blocks = blocksData;
    if (lang === "en") {
      try {
        const mod = await import("@/data/blocks.en.json");
        blocks = mod.default as typeof blocksData;
      } catch {
        // fall back to PT
      }
    } else if (lang === "es") {
      try {
        const mod = await import("@/data/blocks.es.json");
        blocks = mod.default as typeof blocksData;
      } catch {
        // fall back to PT
      }
    }
    const itinerary = buildItinerary(profile, blocks as Parameters<typeof buildItinerary>[1]);
    setResult(itinerary);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--color-sand)" }}>
      {result ? (
        <ItineraryView result={result} lang={lang} onLangChange={handleLangChange} onReset={handleReset} />
      ) : (
        <IntakeForm lang={lang} onLangChange={handleLangChange} onSubmit={handleSubmit} />
      )}
    </main>
  );
}
