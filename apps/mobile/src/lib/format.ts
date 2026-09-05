/**
 * Zahlen und Zeitpunkte, wie sie auf Papier stehen.
 *
 * Deutsche Schreibweise ist hier keine Lokalisierung, sondern Teil des
 * Produkts: eine deutsche Rechtsakte schreibt "5. September 2026", nicht
 * "9/5/2026". Sollte einmal eine zweite Sprache dazukommen, ist das hier die
 * eine Stelle, an der sie beginnt.
 */

export function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function kurzdatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dateigroesse(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
