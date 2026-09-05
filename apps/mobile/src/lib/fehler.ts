/**
 * Fehler, die jemand lesen soll.
 *
 * Supabase antwortet englisch und technisch. Diese Texte stehen direkt neben
 * der deutschen Oberfläche, deshalb werden sie übersetzt statt durchgereicht.
 * Die Übersetzung sitzt an einer Stelle, weil sonst jeder Bildschirm seine
 * eigene Formulierung für denselben Fehler erfindet.
 *
 * Zwei Regeln, die hier nicht verhandelbar sind:
 *
 * - **Nie mehr verraten als nötig.** Ob zu einer E-Mail-Adresse ein Konto
 *   existiert, ist bei einer Rechtsakte selbst schon eine Auskunft.
 * - **Nie die Rohmeldung zeigen.** Sie nennt Tabellen, Policies und Spalten.
 */

export function beschreibeAuthFehler(fehler: unknown): string {
  const text = fehler instanceof Error ? fehler.message : "";
  if (/rate limit|after \d+ seconds?/i.test(text)) {
    return "Zu viele Anfragen. Bitte einen Moment warten.";
  }
  if (/expired|invalid|token/i.test(text)) {
    return "Der Code stimmt nicht oder ist abgelaufen.";
  }
  if (/email/i.test(text)) {
    return "Mit dieser E-Mail-Adresse hat es nicht geklappt.";
  }
  return "Das hat nicht geklappt. Bitte erneut versuchen.";
}

/**
 * Supabase nennt die Restzeit der Sperrfrist im Fehlertext. Die ist brauchbar:
 * daraus wird ein Countdown statt einer Sackgasse.
 */
export function gesperrteSekunden(fehler: unknown): number {
  const text = fehler instanceof Error ? fehler.message : "";
  return Number(text.match(/after (\d+) seconds?/)?.[1] ?? 0);
}
