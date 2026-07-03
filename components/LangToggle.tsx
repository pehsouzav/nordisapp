"use client";

import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  onChange: (l: Lang) => void;
  compact?: boolean;
}

export default function LangToggle({ lang, onChange, compact }: Props) {
  return (
    <button
      onClick={() => onChange(lang === "pt" ? "en" : "pt")}
      className={`rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        compact
          ? "px-3 py-1 text-xs"
          : "px-4 py-2 text-sm"
      }`}
      style={{
        borderColor: "var(--color-ocean)",
        color: "var(--color-ocean)",
        background: "transparent",
      }}
      aria-label={lang === "pt" ? "Switch to English" : "Mudar para Português"}
    >
      {lang === "pt" ? "EN" : "PT"}
    </button>
  );
}
