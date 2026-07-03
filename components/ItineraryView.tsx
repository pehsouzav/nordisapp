"use client";

import { useState } from "react";
import type { Lang, ItineraryResult, Window } from "@/lib/types";
import { t } from "@/lib/i18n";
import LangToggle from "./LangToggle";
import rioAgoraData from "@/data/rio_agora.json";
import safetyData from "@/data/safety.json";
import logisticsData from "@/data/logistics.json";

interface Props {
  result: ItineraryResult;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  onReset: () => void;
}

export default function ItineraryView({ result, lang, onLangChange, onReset }: Props) {
  const { schedule, antiFurada, segurancaZonas, logisticaBlockIds, budgetBannerKey, profile } = result;

  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({
    traps: true,
    now: false,
    safety: false,
    logistics: false,
  });

  function toggleLayer(key: string) {
    setOpenLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const vibeLabel = (v: string | null) => {
    if (!v) return "";
    const key = `vibe_${v}` as Parameters<typeof t>[1];
    return t(lang, key);
  };

  const subtitle = (() => {
    const tpl = t(lang, "subtitle_template");
    const daysNum = profile.days.toString();
    const daysLbl = lang === "pt"
      ? (profile.days === 1 ? t(lang, "days_label_singular") : t(lang, "days_label_plural"))
      : t(lang, "days_label_plural");
    const paceKey = `pace_${profile.pace}` as Parameters<typeof t>[1];
    const paceStr = t(lang, paceKey).split(" — ")[0].split(" — ")[0];
    return tpl
      .replace("{days}", daysNum)
      .replace("{days_label}", daysLbl)
      .replace("{vibe1}", vibeLabel(profile.vibePrimary))
      .replace("{vibe2_sep}", profile.vibeSecondary ? " + " : "")
      .replace("{vibe2}", vibeLabel(profile.vibeSecondary))
      .replace("{pace}", paceStr);
  })();

  const budgetKey = `budget_banner_${budgetBannerKey}` as Parameters<typeof t>[1];
  const budgetBanner = t(lang, budgetKey);

  const safetyEntries = safetyData.filter((s) => segurancaZonas.includes(s.zona));
  const logisticsEntries = logisticsData.filter((l) => logisticaBlockIds.includes(l.blockId));

  const rioAgora = rioAgoraData;
  const rioItems = lang === "en" ? rioAgora.en : lang === "es" ? rioAgora.es : rioAgora.pt;

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-sand)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between no-print">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--color-ocean)" }}>
            {t(lang, "brand")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} onChange={onLangChange} compact />
          <button
            onClick={onReset}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t(lang, "new_itinerary")}
          </button>
          <button
            onClick={() => window.print()}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
            style={{ background: "var(--color-sunset)" }}
          >
            {t(lang, "print_btn")}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-8">
        {/* Hero */}
        <div className="rounded-3xl p-6 text-white" style={{ background: "var(--color-ocean)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
            {t(lang, "tagline")}
          </p>
          <h1 className="text-2xl font-bold leading-tight">{t(lang, "result_title")}</h1>
          <p className="mt-2 text-sm opacity-85">{subtitle}</p>
          {budgetBanner && (
            <p className="mt-3 text-xs opacity-75 border-t border-white/20 pt-3">{budgetBanner}</p>
          )}
        </div>

        {/* Day cards */}
        {schedule.map((day) => (
          <div key={day.dayNumber} className="rounded-3xl bg-white shadow-sm overflow-hidden card">
            <div className="px-5 py-3 font-bold text-white text-sm" style={{ background: "var(--color-night)" }}>
              {t(lang, "day")} {day.dayNumber}
            </div>
            <div className="divide-y divide-gray-100">
              {(["manhã", "tarde", "noite"] as Window[]).map((w) => {
                if (!day.windows.includes(w) && !day.placed[w] && !day.freeWindows[w]) return null;
                const placed = day.placed[w];
                const isFree = day.freeWindows[w] || (!day.windows.includes(w));
                const windowLabel = w === "manhã" ? t(lang, "morning") : w === "tarde" ? t(lang, "afternoon") : t(lang, "evening");

                if (isFree && !placed) {
                  return (
                    <div key={w} className="px-5 py-4 bg-gray-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{windowLabel}</span>
                      <p className="mt-1 text-sm text-gray-400 italic">{t(lang, "free_time")}</p>
                    </div>
                  );
                }

                if (!placed) return null;

                const block = placed.block;
                const flags = placed.flags ?? [];

                // Deduplicate: dia-inteiro block shows once even if placed in both manhã+tarde
                if (w === "tarde" && block.periodo === "dia inteiro") {
                  return null;
                }

                const isDiaInteiro = block.periodo === "dia inteiro";

                return (
                  <div key={w} className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <div className="shrink-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {isDiaInteiro
                            ? `${t(lang, "morning")} + ${t(lang, "afternoon")}`
                            : windowLabel}
                        </span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: vibeColor(block.vibePrimary) }}>
                          {block.vibePrimary}
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-1 font-bold text-base" style={{ color: "var(--color-night)" }}>
                      {block.title}
                    </h3>
                    {block.content && (
                      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{block.content}</p>
                    )}
                    {block.extras && (
                      <p className="mt-1.5 text-xs text-gray-500 leading-relaxed whitespace-pre-line">{block.extras}</p>
                    )}
                    {flags.map((flag, fi) => (
                      <FlagBadge key={fi} flag={flag} lang={lang} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Layer: Anti-furada */}
        {antiFurada.length > 0 && (
          <CollapsibleLayer
            icon={t(lang, "layer_traps_icon")}
            title={t(lang, "layer_traps")}
            isOpen={openLayers.traps}
            onToggle={() => toggleLayer("traps")}
          >
            <div className="space-y-4">
              {antiFurada.map((entry) => (
                <div key={entry.blockId}>
                  <p className="font-semibold text-sm" style={{ color: "var(--color-night)" }}>
                    {entry.title}
                  </p>
                  {entry.trap && <p className="text-sm text-gray-600 mt-0.5">{entry.trap}</p>}
                  {entry.fairPrice && (
                    <p className="text-sm mt-1 font-medium" style={{ color: "var(--color-leaf)" }}>
                      💰 {entry.fairPrice}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleLayer>
        )}

        {/* Layer: Rio agora */}
        <CollapsibleLayer
          icon={t(lang, "layer_now_icon")}
          title={`${t(lang, "layer_now")} (${rioAgora.month})`}
          isOpen={openLayers.now}
          onToggle={() => toggleLayer("now")}
        >
          <ul className="space-y-2">
            {rioItems.map((item, i) => (
              <li key={i} className="text-sm text-gray-700">{item}</li>
            ))}
          </ul>
        </CollapsibleLayer>

        {/* Layer: Safety */}
        <CollapsibleLayer
          icon={t(lang, "layer_safety_icon")}
          title={t(lang, "layer_safety")}
          isOpen={openLayers.safety}
          onToggle={() => toggleLayer("safety")}
        >
          <div className="space-y-4">
            {safetyEntries.map((s) => (
              <div key={s.zona}>
                <p className="font-semibold text-sm" style={{ color: "var(--color-night)" }}>{s.zona}</p>
                <p className="text-sm text-gray-600 mt-0.5">{lang === "en" ? s.en : lang === "es" ? s.es : s.pt}</p>
                {s.nightNote && (
                  <p className="text-sm mt-1 text-gray-500 italic">
                    {t(lang, "layer_night_note")} {s.nightNote}
                  </p>
                )}
              </div>
            ))}
            {safetyEntries.length === 0 && (
              <p className="text-sm text-gray-500">
                {lang === "pt" ? "Nenhuma zona específica identificada." : lang === "es" ? "Ninguna zona específica identificada." : "No specific zones identified."}
              </p>
            )}
          </div>
        </CollapsibleLayer>

        {/* Layer: Logistics */}
        {logisticsEntries.length > 0 && (
          <CollapsibleLayer
            icon={t(lang, "layer_logistics_icon")}
            title={t(lang, "layer_logistics")}
            isOpen={openLayers.logistics}
            onToggle={() => toggleLayer("logistics")}
          >
            <div className="space-y-3">
              {logisticsEntries.map((l) => (
                <div key={l.blockId} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">{lang === "en" ? l.label.en : lang === "es" ? l.label.es : l.label.pt}</p>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-80"
                    style={{ background: "var(--color-ocean)" }}
                  >
                    {lang === "pt" ? "Reservar →" : lang === "es" ? "Reservar →" : "Book →"}
                  </a>
                </div>
              ))}
            </div>
          </CollapsibleLayer>
        )}

        {/* Bottom CTA */}
        <div className="no-print flex flex-col sm:flex-row gap-3 pb-4">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-2xl py-3 font-medium text-white"
            style={{ background: "var(--color-night)" }}
          >
            {t(lang, "print_btn")}
          </button>
          <button
            onClick={onReset}
            className="flex-1 rounded-2xl py-3 font-medium border-2"
            style={{ borderColor: "var(--color-ocean)", color: "var(--color-ocean)" }}
          >
            {t(lang, "new_itinerary")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagBadge({ flag, lang }: { flag: string; lang: Lang }) {
  if (flag === "flag_weather") {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        ☀️ {t(lang, "flag_weather")}
      </div>
    );
  }
  if (flag.startsWith("flag_day_constraint:")) {
    const constraint = flag.replace("flag_day_constraint:", "");
    const msg = t(lang, "flag_day_constraint").replace("{constraint}", constraint);
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        📅 {msg}
      </div>
    );
  }
  return null;
}

function CollapsibleLayer({
  icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white shadow-sm overflow-hidden card">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between font-bold text-left"
        aria-expanded={isOpen}
      >
        <span style={{ color: "var(--color-night)" }}>
          {icon} {title}
        </span>
        <span className="text-gray-400 text-lg">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function vibeColor(vibe: string): string {
  const map: Record<string, string> = {
    praia: "#1a6b8a",
    cultura: "#7c3aed",
    noturna: "#1a1f3c",
    natureza: "#2d7a4f",
    gastronomia: "#c2410c",
    "bate-volta": "#0369a1",
    extra: "#6b7280",
  };
  return map[vibe] ?? "#6b7280";
}
