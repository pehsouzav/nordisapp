export type Vibe = "praia" | "cultura" | "noturna" | "natureza" | "gastronomia" | "bate-volta" | "extra";
export type Zona =
  | "Zona Sul"
  | "Centro/Porto"
  | "Santa Teresa/Lapa"
  | "Tijuca"
  | "Zona Oeste"
  | "Fora do Rio"
  | "Varia";
export type Periodo = "manhã" | "tarde" | "noite" | "dia inteiro";
export type Window = "manhã" | "tarde" | "noite";
export type Companion = "solo" | "casal" | "amigos" | "familia";
export type Pace = "tranquilo" | "equilibrado" | "intenso";
export type Budget = "economico" | "medio" | "sem_limites";

export interface Block {
  id: string;
  title: string;
  vibePrimary: Vibe;
  vibeSecondary: Vibe | null;
  zona: Zona;
  periodo: Periodo;
  essentialFirstTime: boolean;
  weatherDependent: boolean;
  dayConstraint: string | null;
  fit: string[];
  content: string;
  trap: string;
  fairPrice: string;
  _score?: number;
}

export interface Profile {
  days: number;
  firstTimer: boolean;
  vibePrimary: Vibe;
  vibeSecondary: Vibe | null;
  companion: Companion;
  pace: Pace;
  budget: Budget;
  arrivalDate: string | null; // ISO date string
}

export interface PlacedBlock {
  block: Block;
  flags: string[];
}

export interface DaySchedule {
  dayNumber: number;
  windows: Window[];
  placed: Record<Window, PlacedBlock | null>;
  freeWindows: Record<Window, boolean>;
}

export interface AntiFuradaEntry {
  blockId: string;
  title: string;
  trap: string;
  fairPrice: string;
}

export interface ItineraryResult {
  days: number;
  schedule: DaySchedule[];
  allPlaced: PlacedBlock[];
  antiFurada: AntiFuradaEntry[];
  rioAgoraKey: string;
  segurancaZonas: string[];
  logisticaBlockIds: string[];
  budgetBannerKey: Budget;
  profile: Profile;
}

export type Lang = "pt" | "en";

export interface RioAgora {
  month: string;
  pt: string[];
  en: string[];
}

export interface SafetyEntry {
  zona: string;
  pt: string;
  en: string;
  nightNote: string;
}

export interface LogisticsEntry {
  blockId: string;
  label: { pt: string; en: string };
  url: string;
}
