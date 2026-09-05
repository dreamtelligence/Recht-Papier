import { supabase } from "@/lib/supabase";
import type { Citation } from "./typen";

/**
 * Der Zugang zu Gesetzen und Urteilen — ausschließlich über unser Backend.
 *
 * **Diese Datei sah einmal anders aus.** Sie hatte einen zweiten, direkten Weg:
 * öffentliches Recht durfte das Gerät bei der Engine selbst abfragen, weil
 * Gesetzestext öffentlich ist und kein Sachverhalt darin steckt. Die
 * Überlegung war richtig und die Schlussfolgerung trotzdem falsch.
 *
 * Was dabei übersehen wurde: Juras API hatte keinerlei Authentifizierung. Ein
 * Abruf von `/api/legal/stats` gegen den veröffentlichten Modal-Endpunkt
 * antwortete jedem im Netz mit HTTP 200 — nachgemessen, nicht vermutet. Und
 * `/api/legal/ask` startet dabei einen kostenpflichtigen LLM-Aufruf.
 *
 * Ein Schlüssel in der App hätte das nicht geheilt: ein Geheimnis in einem
 * Mobile-Bundle ist keines, es lässt sich in Minuten herauslösen. Sobald die
 * Engine also einen Schlüssel verlangt — und sie verlangt jetzt einen —, kann
 * das Gerät sie nicht mehr direkt fragen, ohne genau diesen Schlüssel
 * preiszugeben.
 *
 * Deshalb gilt ohne Ausnahme: **die App kennt die Adresse der Engine nicht.**
 * Jede Anfrage läuft über unser Backend, das das Nutzertoken prüft, die
 * Berechtigung auflöst und den Engine-Schlüssel besitzt. Das kostet einen
 * Netzwerksprung und spart eine offene Rechnung.
 */

/**
 * Was beim Nachschlagen zurückkommt.
 *
 * Bewusst schmaler als die Antwort der Engine: `retrieval_plan` und
 * `source_audit` sind interne Diagnose und werden von der Edge Function
 * abgeschnitten. Vom Audit bleibt nur, was die Oberfläche wirklich braucht —
 * ob die Antwort unbelegte Aussagen enthält. Eine Antwort mit hoher
 * Beanstandung darf nicht aussehen wie eine geprüfte.
 */
export type RechtAntwort = {
  answer: string;
  citations: Citation[];
  model: string;
  rechtsgebiet: string | null;
  audit: { status: string; high_severity_count: number };
};

class RechtFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RechtFehler";
  }
}

/**
 * Allgemeine Rechtsfrage nachschlagen. Kein Falltext.
 *
 * Für Fragen, die keinen Sachverhalt tragen — „Wie lang ist die Kündigungsfrist
 * nach zehn Jahren?". Läuft trotzdem über das Backend, weil die App den
 * Engine-Schlüssel nicht halten kann.
 */
export async function rechtNachschlagen(frage: string): Promise<RechtAntwort> {
  const { data, error } = await supabase.functions.invoke("recht-nachschlagen", {
    body: { frage },
  });
  if (error) throw new RechtFehler("Das Nachschlagen ist zurzeit nicht möglich.");
  return data as RechtAntwort;
}

/**
 * Die rechtliche Einordnung eines konkreten Falls.
 *
 * Der Client schickt nur die Fall-ID. Alles Weitere — Token prüfen,
 * Eigentümerschaft auflösen, Falltext pseudonymisieren, Engine und Modell
 * befragen, Analyse und Fundstellen in die Akte schreiben — passiert
 * serverseitig. Der Sachverhalt verlässt das Gerät nur in Richtung Supabase,
 * nie in Richtung Engine oder Modellanbieter.
 *
 * Die Gegenstelle ist noch nicht deployt; dieser Aufruf ist die Naht, an der
 * sie andockt. Bis dahin meldet der Bildschirm „noch nicht angeschlossen",
 * statt eine Analyse vorzutäuschen.
 */
export async function fallEinordnen(caseId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("fall-einordnen", {
    body: { case_id: caseId },
  });
  if (error) throw new RechtFehler("Die Einordnung ist noch nicht angeschlossen.");
}
