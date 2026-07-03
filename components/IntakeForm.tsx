"use client";

import { useState } from "react";
import type { Lang, Profile, Vibe, Companion, Pace, Budget, AppUser } from "@/lib/types";
import { t } from "@/lib/i18n";

const TOTAL_STEPS = 7; // lang(0), days(1), first(2), vibes(3), companion(4), pace(5), budget+arrival(6)

interface Props {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  onSubmit: (profile: Profile) => void;
  user: AppUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const VIBES: Vibe[] = ["praia", "cultura", "noturna", "natureza", "gastronomia"];

export default function IntakeForm({ lang, onLangChange, onSubmit, user, onSignIn, onSignOut }: Props) {
  const [step, setStep] = useState(0);
  const [days, setDays] = useState<number | null>(null);
  const [firstTimer, setFirstTimer] = useState<boolean | null>(null);
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);
  const [budget, setBudget] = useState<Budget>("medio");
  const [arrivalDate, setArrivalDate] = useState<string>("");
  const [error, setError] = useState<string>("");

  const vibeLabel = (v: Vibe) => {
    const key = `vibe_${v}` as Parameters<typeof t>[1];
    return t(lang, key);
  };

  function toggleVibe(v: Vibe) {
    setVibes((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, v];
    });
  }

  function validateStep(): boolean {
    setError("");
    if (step === 1 && !days) { setError(t(lang, "select_days")); return false; }
    if (step === 2 && firstTimer === null) { return false; }
    if (step === 3 && vibes.length === 0) { setError(t(lang, "select_at_least_one_vibe")); return false; }
    if (step === 4 && !companion) { setError(t(lang, "select_companion")); return false; }
    if (step === 5 && !pace) { setError(t(lang, "select_pace")); return false; }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSubmit() {
    if (!days || firstTimer === null || vibes.length === 0 || !companion || !pace) return;
    onSubmit({
      days,
      firstTimer,
      vibePrimary: vibes[0],
      vibeSecondary: vibes[1] ?? null,
      companion,
      pace,
      budget,
      arrivalDate: arrivalDate || null,
    });
  }

  const btnBase =
    "w-full rounded-2xl border-2 p-4 text-left font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer";
  const btnSelected =
    "border-transparent text-white shadow-md";
  const btnUnselected =
    "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

  const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between no-print">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--color-ocean)" }}>
            {t(lang, "brand")}
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={onSignOut}
              className="text-xs font-medium"
              style={{ color: "var(--color-ocean)" }}
            >
              {lang === "pt" ? "Sair" : lang === "es" ? "Salir" : "Sign out"}
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="text-xs font-medium"
            style={{ color: "var(--color-ocean)" }}
          >
            {lang === "pt" ? "Entrar" : lang === "es" ? "Iniciar sesión" : "Sign in"}
          </button>
        )}
      </header>

      {/* Progress bar */}
      {step > 0 && (
        <div className="h-1 bg-gray-100 no-print">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "var(--color-ocean)" }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Step 0 — Hero + language */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold" style={{ color: "var(--color-ocean)" }}>
                  {t(lang, "brand")}
                </h1>
                <p className="text-xl text-gray-600">{t(lang, "tagline")}</p>
              </div>
              <div className="rounded-3xl p-6 space-y-4" style={{ background: "white" }}>
                <p className="text-sm font-medium text-gray-500">{t(lang, "language_prompt")}</p>
                <div className="grid grid-cols-3 gap-3">
                  {([["pt", "🇧🇷 Português"], ["en", "🇺🇸 English"], ["es", "🇦🇷 Español"]] as [Lang, string][]).map(([l, label]) => (
                    <button
                      key={l}
                      onClick={() => onLangChange(l)}
                      className={`${btnBase} text-center ${lang === l ? btnSelected : btnUnselected}`}
                      style={lang === l ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full rounded-2xl py-4 px-6 text-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "var(--color-sunset)" }}
              >
                {lang === "pt" ? "Começar →" : lang === "es" ? "Empezar →" : "Start →"}
              </button>
            </div>
          )}

          {/* Step 1 — Days */}
          {step === 1 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_days_label")} error={error}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`${btnBase} text-center py-5 ${days === d ? btnSelected : btnUnselected}`}
                    style={days === d ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                  >
                    <span className="text-2xl font-bold">{d === 6 ? "6+" : d}</span>
                    <span className="block text-xs mt-1 opacity-70">
                      {d === 1 ? t(lang, "days_label_singular") : t(lang, "days_label_plural")}
                    </span>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Step 2 — First timer */}
          {step === 2 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_first_label")} error={error}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setFirstTimer(v)}
                    className={`${btnBase} text-center py-6 ${firstTimer === v ? btnSelected : btnUnselected}`}
                    style={firstTimer === v ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                  >
                    <span className="text-2xl">{v ? "✨" : "🔁"}</span>
                    <span className="block mt-1 font-semibold">{v ? t(lang, "q_first_yes") : t(lang, "q_first_no")}</span>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Step 3 — Vibes */}
          {step === 3 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_vibes_label")} hint={t(lang, "q_vibes_hint")} error={error}>
              <div className="space-y-2">
                {VIBES.map((v) => {
                  const idx = vibes.indexOf(v);
                  const isSelected = idx !== -1;
                  const badge = idx === 0 ? "1°" : idx === 1 ? "2°" : null;
                  return (
                    <button
                      key={v}
                      onClick={() => toggleVibe(v)}
                      className={`${btnBase} flex items-center justify-between ${isSelected ? btnSelected : btnUnselected}`}
                      style={isSelected ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                    >
                      <span>{vibeEmoji(v)} {vibeLabel(v)}</span>
                      {badge && (
                        <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-white/20">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </StepWrapper>
          )}

          {/* Step 4 — Companion */}
          {step === 4 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_companion_label")} error={error}>
              <div className="grid grid-cols-2 gap-3">
                {(["solo", "casal", "amigos", "familia"] as Companion[]).map((c) => {
                  const key = `companion_${c}` as Parameters<typeof t>[1];
                  return (
                    <button
                      key={c}
                      onClick={() => setCompanion(c)}
                      className={`${btnBase} text-center py-5 ${companion === c ? btnSelected : btnUnselected}`}
                      style={companion === c ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                    >
                      <span className="text-2xl">{companionEmoji(c)}</span>
                      <span className="block mt-1 text-sm">{t(lang, key)}</span>
                    </button>
                  );
                })}
              </div>
            </StepWrapper>
          )}

          {/* Step 5 — Pace */}
          {step === 5 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_pace_label")} error={error}>
              <div className="space-y-3">
                {(["tranquilo", "equilibrado", "intenso"] as Pace[]).map((p) => {
                  const key = `pace_${p}` as Parameters<typeof t>[1];
                  return (
                    <button
                      key={p}
                      onClick={() => setPace(p)}
                      className={`${btnBase} flex items-center gap-4 ${pace === p ? btnSelected : btnUnselected}`}
                      style={pace === p ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                    >
                      <span className="text-2xl shrink-0">{paceEmoji(p)}</span>
                      <span>{t(lang, key)}</span>
                    </button>
                  );
                })}
              </div>
            </StepWrapper>
          )}

          {/* Step 6 — Budget + Arrival date */}
          {step === 6 && (
            <StepWrapper lang={lang} step={step} label={t(lang, "q_budget_label")} error={error} hideNext>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(["economico", "medio", "sem_limites"] as Budget[]).map((b) => {
                    const key = `budget_${b}` as Parameters<typeof t>[1];
                    return (
                      <button
                        key={b}
                        onClick={() => setBudget(b)}
                        className={`${btnBase} text-center py-4 ${budget === b ? btnSelected : btnUnselected}`}
                        style={budget === b ? { background: "var(--color-ocean)", borderColor: "var(--color-ocean)" } : {}}
                      >
                        <span className="text-lg">{budgetEmoji(b)}</span>
                        <span className="block text-xs mt-1">{t(lang, key)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t(lang, "q_arrival_label")}
                    <span className="ml-1 text-xs text-gray-400">({t(lang, "skip")})</span>
                  </label>
                  <p className="text-xs text-gray-400">{t(lang, "q_arrival_hint")}</p>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ "--tw-ring-color": "var(--color-ocean)" } as React.CSSProperties}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full rounded-2xl py-4 px-6 text-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ background: "var(--color-sunset)" }}
                >
                  {t(lang, "generate")} →
                </button>
              </div>
            </StepWrapper>
          )}

          {/* Navigation */}
          {step > 0 && step < 6 && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={back}
                className="flex-1 rounded-2xl border-2 border-gray-200 bg-white py-3 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← {t(lang, "back")}
              </button>
              <button
                onClick={next}
                className="flex-[2] rounded-2xl py-3 font-bold text-white transition-transform hover:scale-[1.01] active:scale-95"
                style={{ background: "var(--color-ocean)" }}
              >
                {t(lang, "next")} →
              </button>
            </div>
          )}
          {step === 6 && (
            <div className="mt-3">
              <button
                onClick={back}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white py-3 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← {t(lang, "back")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWrapper({
  lang,
  step,
  label,
  hint,
  error,
  children,
  hideNext,
}: {
  lang: Lang;
  step: number;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  hideNext?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-stone)" }}>
          {t(lang, "step")} {step} {t(lang, "of")} {TOTAL_STEPS - 1}
        </p>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-night)" }}>
          {label}
        </h2>
        {hint && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
      </div>
      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-sunset)" }}>{error}</p>
      )}
      {children}
    </div>
  );
}

function vibeEmoji(v: string): string {
  const map: Record<string, string> = {
    praia: "🏖️", cultura: "🏛️", noturna: "🌙", natureza: "🌿", gastronomia: "🍻",
  };
  return map[v] ?? "✨";
}

function companionEmoji(c: string): string {
  const map: Record<string, string> = {
    solo: "🧳", casal: "💑", amigos: "👯", familia: "👨‍👩‍👧",
  };
  return map[c] ?? "👤";
}

function paceEmoji(p: string): string {
  const map: Record<string, string> = {
    tranquilo: "🌊", equilibrado: "⚖️", intenso: "⚡",
  };
  return map[p] ?? "▶️";
}

function budgetEmoji(b: string): string {
  const map: Record<string, string> = {
    economico: "💰", medio: "💳", sem_limites: "✨",
  };
  return map[b] ?? "💵";
}
