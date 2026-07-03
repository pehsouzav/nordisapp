"use client";

import { useState, useEffect, useCallback } from "react";
import IntakeForm from "@/components/IntakeForm";
import ItineraryView from "@/components/ItineraryView";
import AuthModal from "@/components/AuthModal";
import { buildItinerary } from "@/lib/engine";
import { supabase } from "@/lib/supabase";
import type { Profile, ItineraryResult, Lang, AppUser } from "@/lib/types";
import blocksData from "@/data/blocks.json";

export default function Home() {
  const [lang, setLang] = useState<Lang>("pt");
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  // Pending profile while user completes auth
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

  // Load lang preference
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

  const loadUserMeta = useCallback(async (userId: string, email: string) => {
    const { data } = await supabase
      .from("user_meta")
      .select("paid")
      .eq("user_id", userId)
      .maybeSingle();
    setUser({ id: userId, email, isPaid: data?.paid ?? false });
  }, []);

  const loadSavedItinerary = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("itineraries")
      .select("result")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.result) {
      setResult(data.result as ItineraryResult);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadUserMeta(session.user.id, session.user.email ?? "");
          await loadSavedItinerary(session.user.id);
        } else {
          setUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [loadUserMeta, loadSavedItinerary]);

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem("rio_lang", l);
  }

  async function generateAndSave(profile: Profile) {
    let blocks = blocksData;
    if (lang === "en") {
      try { const m = await import("@/data/blocks.en.json"); blocks = m.default as typeof blocksData; } catch {}
    } else if (lang === "es") {
      try { const m = await import("@/data/blocks.es.json"); blocks = m.default as typeof blocksData; } catch {}
    }

    const itinerary = buildItinerary(profile, blocks as Parameters<typeof buildItinerary>[1]);
    setResult(itinerary);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Save to Supabase if logged in
    if (user) {
      await supabase.from("itineraries").insert({
        user_id: user.id,
        lang,
        profile,
        result: itinerary,
      });
    }
  }

  async function handleSubmit(profile: Profile) {
    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPendingProfile(profile);
      setShowAuth(true);
      return;
    }
    await generateAndSave(profile);
  }

  async function handleAuthSuccess() {
    setShowAuth(false);
    // Auth state change listener will set user; give it a tick then generate
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && pendingProfile) {
        await loadUserMeta(session.user.id, session.user.email ?? "");
        await generateAndSave(pendingProfile);
        setPendingProfile(null);
      }
    }, 300);
  }

  function handleReset() {
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setResult(null);
    setUser(null);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--color-sand)" }}>
      {result ? (
        <ItineraryView
          result={result}
          lang={lang}
          isPaid={user?.isPaid ?? false}
          onReset={handleReset}
          onSignOut={user ? handleSignOut : undefined}
          userEmail={user?.email}
        />
      ) : (
        <IntakeForm lang={lang} onLangChange={handleLangChange} onSubmit={handleSubmit} />
      )}

      {showAuth && (
        <AuthModal
          lang={lang}
          onSuccess={handleAuthSuccess}
          onClose={() => { setShowAuth(false); setPendingProfile(null); }}
        />
      )}
    </main>
  );
}
