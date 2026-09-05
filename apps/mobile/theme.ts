/**
 * Die Designsprache von Recht & Papier.
 *
 * Übernommen aus dem Web-Prototyp (Tag `mockup-prototype`, `src/prototype.css`).
 * Warmes Papier statt Dashboard, Tinte statt Schwarz, gedämpftes Blaugrau als
 * einziger Akzent. Die Werte sind bewusst dieselben Zahlen wie dort — wer die
 * beiden Stände nebeneinanderlegt, soll dieselbe App sehen.
 */

import { Platform } from "react-native";

export const colors = {
  paper: "#f4efe3",
  paperDeep: "#e8dfcf",
  ink: "#24251f",
  inkSoft: "#666458",
  accent: "#53666c",
  accentDark: "#34494f",
  line: "rgba(49, 48, 40, 0.14)",
  onAccent: "#fbf8f0",
  success: "#455b52",
} as const;

/**
 * Die Serifenschrift trägt den Papiercharakter.
 *
 * Bekannte Lücke: Georgia liegt auf iOS bereit, auf Android nicht — dort fällt
 * das System auf eine Grotesk zurück und die Anmutung bricht. Vor dem
 * Android-Build gehört hier eine mitgelieferte Serifenschrift hin.
 */
export const fonts = {
  serif: Platform.select({ ios: "Georgia", default: "serif" }) as string,
  sans: Platform.select({ ios: "System", default: "sans-serif" }) as string,
};

export const radius = {
  control: 8,
  sheet: 22,
} as const;
