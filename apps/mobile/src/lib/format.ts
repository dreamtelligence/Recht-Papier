/**
 * Zahlen und Zeitpunkte, wie sie auf Papier stehen.
 *
 * Deutsche Schreibweise ist hier keine Lokalisierung, sondern Teil des
 * Produkts: eine deutsche Rechtsakte schreibt "5. September 2026", nicht
 * "9/5/2026". Sollte einmal eine zweite Sprache dazukommen, ist das hier die
 * eine Stelle, an der sie beginnt.
 */

/**
 * Ein reines Datum ist kein Zeitpunkt.
 *
 * `new Date("2026-09-21")` liest den Wert als Mitternacht UTC. In einer Zone
 * westlich von Greenwich zeigt `toLocaleDateString` dann den Vortag — bei
 * einer Klagefrist ist das kein Schönheitsfehler. Datumsspalten kommen aus
 * Postgres in dieser Form; Zeitstempel tragen eine Uhrzeit und dürfen so
 * bleiben, wie sie sind.
 */
function alsLokalesDatum(iso: string): Date {
  const nurDatum = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!nurDatum) return new Date(iso);
  return new Date(Number(nurDatum[1]), Number(nurDatum[2]) - 1, Number(nurDatum[3]));
}

export function datum(iso: string): string {
  return alsLokalesDatum(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function kurzdatum(iso: string): string {
  return alsLokalesDatum(iso).toLocaleDateString("de-DE", {
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
