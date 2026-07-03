import ptDict from "@/i18n/pt.json";
import enDict from "@/i18n/en.json";
import type { Lang } from "./types";

type Dict = typeof ptDict;

const dicts: Record<Lang, Dict> = { pt: ptDict, en: enDict };

export function t(lang: Lang, key: keyof Dict): string {
  return dicts[lang][key] ?? key;
}

export function getLang(raw: string | null | undefined): Lang {
  if (raw === "en") return "en";
  return "pt";
}
