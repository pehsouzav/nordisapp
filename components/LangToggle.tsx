"use client";

import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  onChange: (l: Lang) => void;
  compact?: boolean;
}

const LANGS: { code: Lang; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export default function LangToggle({ lang, onChange, compact }: Props) {
  return (
    <div className={`flex gap-1 ${compact ? "" : "gap-2"}`}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
          style={
            lang === code
              ? { borderColor: "var(--color-ocean)", color: "white", background: "var(--color-ocean)" }
              : { borderColor: "var(--color-ocean)", color: "var(--color-ocean)", background: "transparent" }
          }
          aria-label={`Switch to ${label}`}
          aria-pressed={lang === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
