import ptDict from "@/i18n/pt.json";
import enDict from "@/i18n/en.json";
import esDict from "@/i18n/es.json";
import type { Lang } from "./types";

type Dict = typeof ptDict;

const dicts: Record<Lang, Dict> = { pt: ptDict, en: enDict, es: esDict as unknown as Dict };

export function t(lang: Lang, key: keyof Dict): string {
  return (dicts[lang][key] ?? dicts["pt"][key] ?? key) as string;
}

export function getLang(raw: string | null | undefined): Lang {
  if (raw === "en") return "en";
  if (raw === "es") return "es";
  return "pt";
}
