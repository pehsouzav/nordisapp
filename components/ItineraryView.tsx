"use client";

import { useState, useMemo } from "react";
import type { Lang, ItineraryResult, Window } from "@/lib/types";
import { t } from "@/lib/i18n";
import rioAgoraData from "@/data/rio_agora.json";
import safetyData from "@/data/safety.json";
import logisticsData from "@/data/logistics.json";

const HOTMART_URL =
  process.env.NEXT_PUBLIC_HOTMART_URL ?? "https://pay.hotmart.com/T104136786T";

// Type for the new multi-month rio_agora.json structure
type RioAgoraMonth = { name: string; pt: string[]; en: string[]; es: string[] };
const rioAgoraMonths = rioAgoraData as Record<string, RioAgoraMonth>;

interface Props {
  result: ItineraryResult;
  lang: Lang;
  isPaid: boolean;
  onReset: () => void;
  onSignOut?: () => void;
  userEmail?: string;
}

export default function ItineraryView({
  result,
  lang,
  isPaid,
  onReset,
  onSignOut,
  userEmail,
}: Props) {
  const { schedule, antiFurada, logisticaBlockIds, budgetBannerKey, profile } = result;

  const [activeDay, setActiveDay] = useState(1);
  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({
    now: false,
  });

  function toggleLayer(key: string) {
    setOpenLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const antiFuradaMap = useMemo(
    () => Object.fromEntries(antiFurada.map((e) => [e.blockId, e])),
    [antiFurada]
  );

  const logisticsEntries = useMemo(
    () => logisticsData.filter((l) => logisticaBlockIds.includes(l.blockId)),
    [logisticaBlockIds]
  );

  const logisticsMap = useMemo(
    () => Object.fromEntries(logisticsEntries.map((l) => [l.blockId, l])),
    [logisticsEntries]
  );

  const safetyMap = useMemo(
    () => Object.fromEntries(safetyData.map((s) => [s.zona, s])),
    []
  );

  // For each day view: compute which block IDs are the FIRST occurrence of their zone
  const activeSchedule = schedule.find((d) => d.dayNumber === activeDay);

  const firstZoneBlockIds = useMemo(() => {
    if (!activeSchedule) return new Set<string>();
    const seen = new Set<string>();
    const result = new Set<string>();
    for (const w of ["manhã", "tarde", "noite"] as Window[]) {
      const placed = activeSchedule.placed[w];
      if (!placed) continue;
      const zona = placed.block.zona;
      if (!seen.has(zona)) {
        seen.add(zona);
        result.add(placed.block.id);
      }
    }
    return result;
  }, [activeSchedule]);

  // Rio Now — pick the right month from arrival date
  const travelMonth = profile.arrivalDate
    ? new Date(profile.arrivalDate + "T12:00:00").getMonth() + 1
    : new Date().getMonth() + 1;
  const rioAgoraEntry = rioAgoraMonths[String(travelMonth)];
  const rioItems =
    lang === "en" ? rioAgoraEntry.en : lang === "es" ? rioAgoraEntry.es : rioAgoraEntry.pt;
  const rioMonthName = rioAgoraEntry.name;

  const vibeLabel = (v: string | null) => {
    if (!v) return "";
    const key = `vibe_${v}` as Parameters<typeof t>[1];
    return t(lang, key);
  };

  const subtitle = (() => {
    const tpl = t(lang, "subtitle_template");
    const daysNum = profile.days.toString();
    const daysLbl =
      lang === "pt"
        ? profile.days === 1
          ? t(lang, "days_label_singular")
          : t(lang, "days_label_plural")
        : t(lang, "days_label_plural");
    const paceKey = `pace_${profile.pace}` as Parameters<typeof t>[1];
    const paceStr = t(lang, paceKey).split(" — ")[0];
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

  const paywallLabel = {
    pt: {
      heading: `Veja seu roteiro completo de ${profile.days} dias`,
      hint: "Use o mesmo e-mail aqui e no checkout",
      btn: "Desbloquear agora →",
    },
    en: {
      heading: `See your full ${profile.days}-day itinerary`,
      hint: "Use the same email here as on checkout",
      btn: "Unlock now →",
    },
    es: {
      heading: `Ve tu itinerario completo de ${profile.days} días`,
      hint: "Usa el mismo correo aquí y en el checkout",
      btn: "Desbloquear ahora →",
    },
  }[lang];

  const activeDayIndex = activeDay - 1;
  const isLocked = activeDayIndex > 0 && !isPaid;

  const safetyLabel =
    lang === "pt" ? "Segurança" : lang === "es" ? "Seguridad" : "Safety";

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-sand)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between no-print">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--color-ocean)" }}>
            {t(lang, "brand")}
          </p>
          {userEmail && (
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{userEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {lang === "pt" ? "Sair" : lang === "es" ? "Salir" : "Sign out"}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
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

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-print -mx-4 px-4">
          {schedule.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setActiveDay(day.dayNumber)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeDay === day.dayNumber
                  ? "text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              style={activeDay === day.dayNumber ? { background: "var(--color-ocean)" } : {}}
            >
              {t(lang, "day")} {day.dayNumber}
            </button>
          ))}
        </div>

        {/* Active day card */}
        {activeSchedule && (
          isLocked ? (
            <div className="relative rounded-3xl bg-white shadow-sm overflow-hidden card">
              <div className="opacity-30 pointer-events-none select-none blur-sm px-5 py-4">
                <div
                  className="font-bold text-sm text-white px-5 py-3 rounded-t-3xl mb-2"
                  style={{ background: "var(--color-night)" }}
                >
                  {t(lang, "day")} {activeSchedule.dayNumber}
                </div>
                <div className="space-y-3 pt-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mt-4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-8 gap-3">
                <span className="text-3xl">🔒</span>
                <p className="font-bold text-lg" style={{ color: "var(--color-night)" }}>
                  {paywallLabel.heading}
                </p>
                <p className="text-xs text-gray-500">{paywallLabel.hint}</p>
                <a
                  href={HOTMART_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 rounded-2xl px-6 py-3 font-bold text-white text-sm transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ background: "var(--color-sunset)" }}
                >
                  {paywallLabel.btn}
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white shadow-sm overflow-hidden card">
              <div className="px-5 py-3 font-bold text-white" style={{ background: "var(--color-night)" }}>
                <span className="text-sm">{t(lang, "day")} {activeSchedule.dayNumber}</span>
                {profile.arrivalDate && (
                  <span className="block text-xs font-normal opacity-70 mt-0.5 capitalize">
                    {formatDayDate(profile.arrivalDate, activeDayIndex, lang)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {(["manhã", "tarde", "noite"] as Window[]).map((w) => {
                  if (
                    !activeSchedule.windows.includes(w) &&
                    !activeSchedule.placed[w] &&
                    !activeSchedule.freeWindows[w]
                  )
                    return null;

                  const placed = activeSchedule.placed[w];
                  const isFree =
                    activeSchedule.freeWindows[w] || !activeSchedule.windows.includes(w);
                  const windowLabel =
                    w === "manhã"
                      ? t(lang, "morning")
                      : w === "tarde"
                      ? t(lang, "afternoon")
                      : t(lang, "evening");

                  if (isFree && !placed) {
                    return (
                      <div key={w} className="px-5 py-4 bg-gray-50">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {windowLabel}
                        </span>
                        <p className="mt-1 text-sm text-gray-400 italic">{t(lang, "free_time")}</p>
                      </div>
                    );
                  }

                  if (!placed) return null;

                  const block = placed.block;
                  const flags = placed.flags ?? [];

                  if (w === "tarde" && block.periodo === "dia inteiro") return null;
                  const isDiaInteiro = block.periodo === "dia inteiro";

                  const antiFuradaEntry = antiFuradaMap[block.id];
                  const logisticsEntry = logisticsMap[block.id];
                  const safetyEntry = safetyMap[block.zona];
                  const showSafety = !!safetyEntry && firstZoneBlockIds.has(block.id);

                  return (
                    <div key={w} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {isDiaInteiro
                            ? `${t(lang, "morning")} + ${t(lang, "afternoon")}`
                            : windowLabel}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                          style={{ background: vibeColor(block.vibePrimary) }}
                        >
                          {block.vibePrimary}
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-base" style={{ color: "var(--color-night)" }}>
                        {block.title}
                      </h3>
                      {block.content && (
                        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                          {block.content}
                        </p>
                      )}
                      {flags.map((flag, fi) => (
                        <FlagBadge key={fi} flag={flag} lang={lang} />
                      ))}
                      {block.extras && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleLayer(`extras_${block.id}`)}
                            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {openLayers[`extras_${block.id}`]
                              ? t(lang, "less_tips")
                              : t(lang, "more_tips")}
                          </button>
                          {openLayers[`extras_${block.id}`] && (
                            <p className="mt-2 text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                              {block.extras}
                            </p>
                          )}
                        </div>
                      )}
                      {logisticsEntry && (
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-600">
                            {lang === "en"
                              ? logisticsEntry.label.en
                              : lang === "es"
                              ? logisticsEntry.label.es
                              : logisticsEntry.label.pt}
                          </p>
                          <a
                            href={logisticsEntry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full text-white"
                            style={{ background: "var(--color-ocean)" }}
                          >
                            {lang === "pt" ? "Reservar →" : lang === "es" ? "Reservar →" : "Book →"}
                          </a>
                        </div>
                      )}
                      {/* Anti-furada — collapsible chip */}
                      {antiFuradaEntry && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleLayer(`furada_${block.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          >
                            ⚠️ {t(lang, "anti_furada_label")}
                            <span className="text-amber-400 text-[10px]">
                              {openLayers[`furada_${block.id}`] ? "▲" : "▼"}
                            </span>
                          </button>
                          {openLayers[`furada_${block.id}`] && (
                            <div className="mt-2 rounded-xl p-3 bg-amber-50 border border-amber-100 space-y-1">
                              <p className="text-sm text-gray-700">{antiFuradaEntry.trap}</p>
                              {antiFuradaEntry.fairPrice && (
                                <p className="text-xs font-medium" style={{ color: "var(--color-leaf)" }}>
                                  {antiFuradaEntry.fairPrice}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Safety — inline, collapsible chip, first occurrence of zone only */}
                      {showSafety && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleLayer(`safety_${block.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                          >
                            🛡️ {safetyLabel} — {block.zona}
                            <span className="text-blue-400 text-[10px]">
                              {openLayers[`safety_${block.id}`] ? "▲" : "▼"}
                            </span>
                          </button>
                          {openLayers[`safety_${block.id}`] && (
                            <div className="mt-2 rounded-xl p-3 bg-blue-50 border border-blue-100 space-y-1">
                              <p className="text-sm text-gray-700">
                                {lang === "en" ? safetyEntry.en : lang === "es" ? safetyEntry.es : safetyEntry.pt}
                              </p>
                              {safetyEntry.nightNote && (
                                <p className="text-xs text-gray-500 italic">
                                  {t(lang, "layer_night_note")} {safetyEntry.nightNote}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Paywall CTA */}
        {!isPaid && profile.days > 1 && (
          <div
            className="rounded-3xl p-6 text-center space-y-3 no-print"
            style={{ background: "var(--color-ocean)" }}
          >
            <p className="text-white font-bold text-lg">{paywallLabel.heading}</p>
            <p className="text-white/70 text-xs">{paywallLabel.hint}</p>
            <a
              href={HOTMART_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-2xl px-8 py-3 font-bold text-sm transition-transform hover:scale-[1.02] active:scale-95"
              style={{ background: "var(--color-sunset)", color: "white" }}
            >
              {paywallLabel.btn}
            </a>
          </div>
        )}

        {/* Rio Now — only for paid or single-day */}
        {(isPaid || profile.days === 1) && (
          <CollapsibleLayer
            icon={t(lang, "layer_now_icon")}
            title={`${t(lang, "layer_now")} (${rioMonthName})`}
            isOpen={openLayers.now}
            onToggle={() => toggleLayer("now")}
          >
            <ul className="space-y-2">
              {rioItems.map((item, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
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
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>
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

function formatDayDate(arrivalDate: string, dayIndex: number, lang: Lang): string {
  const d = new Date(arrivalDate + "T12:00:00");
  d.setDate(d.getDate() + dayIndex);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-AR" : "en-US";
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}
