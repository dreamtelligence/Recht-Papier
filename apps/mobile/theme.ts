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
 * Die Serifenschrift trägt den Papiercharakter — und wird mitgeliefert.
 *
 * Vorher stand hier Georgia: auf iOS zufällig vorhanden, auf Android nicht, und
 * lizenzrechtlich ohnehin nicht auslieferbar (Microsoft-Schrift). Source Serif 4
 * steht unter der OFL, liegt unter `assets/fonts/` und wird vom
 * `expo-font`-Config-Plugin zur Buildzeit eingebettet. Deshalb kein
 * `Platform.select` mehr: beide Plattformen setzen dieselbe Schrift.
 *
 * Die beiden Schnitte sind bewusst getrennte Familien. Die SemiBold-Datei meldet
 * sich intern als eigene Familie, nicht als Gewicht 600 von "Source Serif 4" —
 * `fontWeight` würde auf iOS deshalb ins Leere greifen. Wer halbfett braucht,
 * nimmt `serifBold` statt eines Gewichts.
 *
 * Die Grotesk bleibt bewusst die des Systems: Plattform-Chrome darf sich nativ
 * anfühlen, identisch sein muss die Markenschicht.
 */
export const fonts = {
  serif: "Source Serif 4",
  serifBold: "Source Serif 4 SemiBold",
  sans: Platform.select({ ios: "System", default: "sans-serif" }) as string,
};

export const radius = {
  control: 8,
  // Die Aktionsflaeche ist geschnitten, nicht abgerundet: 8 ist der Default-Look
  // jeder App, 4 liest sich als gedruckter Block und passt zum Papierschnitt der
  // Haarlinien im Register. Die Eingabefelder behalten bewusst die weicheren 8.
  action: 4,
  sheet: 22,
} as const;
