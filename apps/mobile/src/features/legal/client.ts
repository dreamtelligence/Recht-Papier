import { supabase } from "@/lib/supabase";
import type {
  EnhancedAskResponse,
  EngineStats,
  SearchResponse,
} from "./typen";

/**
 * Der Zugang zur Legal-Engine — und die Regel, wer wohin sprechen darf.
 *
 * Es gibt hier zwei getrennte Wege, und die Trennung ist der eigentliche
 * Inhalt dieser Datei:
 *
 * 1. **Öffentliches Recht, direkt.** Gesetzestext und Urteile sind öffentlich.
 *    Eine Suche danach enthält keinen Sachverhalt, also darf das Gerät die
 *    Engine direkt fragen. Das ist der Weg für Nachschlagen und Vorschau.
 *
 * 2. **Falltext, niemals direkt.** Der Sachverhalt ist ein hochsensibles
 *    personenbezogenes Datum. Er geht ausschließlich über eine Supabase Edge
 *    Function an die Engine — dort wird das Nutzertoken geprüft, die
 *    Eigentümerschaft am Fall aufgelöst und das Ergebnis in `case_analyses`
 *    und `case_sources` geschrieben. Zwei Gründe, warum das nicht verhandelbar
 *    ist: die Engine hat keine eigene Authentifizierung, und aus Entscheidung
 *    `d150e31f` folgt, dass der Abfragepfad mit Falltext im EU-Container
 *    landen muss und nie auf US-GPU-Compute.
 *
 * Zu Modal: Modal bleibt, aber für den **Indexaufbau**, nicht für diesen Pfad.
 * Wer `EXPO_PUBLIC_LEGAL_ENGINE_URL` in der Entwicklung auf die Modal-URL
 * zeigen lässt, tut das für öffentliches Recht — für Falltext ist es der
 * falsche Endpunkt, unabhängig davon, ob es technisch funktioniert.
 */

const BASIS = process.env.EXPO_PUBLIC_LEGAL_ENGINE_URL?.replace(/\/+$/, "") ?? "";

export const isEngineConfigured = BASIS.length > 0;

/** Nach 20 Sekunden ist keine Antwort mehr nützlich, nur noch eine hängende Ansicht. */
const ZEITLIMIT_MS = 20_000;

class EngineFehler extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EngineFehler";
  }
}

async function hole<T>(pfad: string, params: Record<string, string | number | undefined>): Promise<T> {
  if (!isEngineConfigured) {
    throw new EngineFehler("EXPO_PUBLIC_LEGAL_ENGINE_URL ist nicht gesetzt");
  }

  const suche = new URLSearchParams();
  for (const [name, wert] of Object.entries(params)) {
    if (wert !== undefined && wert !== "") suche.set(name, String(wert));
  }

  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
  try {
    const antwort = await fetch(`${BASIS}${pfad}?${suche}`, {
      headers: { Accept: "application/json" },
      signal: abbruch.signal,
    });
    if (!antwort.ok) {
      throw new EngineFehler(`Engine antwortete mit ${antwort.status}`, antwort.status);
    }
    return (await antwort.json()) as T;
  } finally {
    clearTimeout(uhr);
  }
}

/** Hybride Suche im Rechtskorpus. Kein Falltext. */
export function sucheRecht(
  frage: string,
  optionen: { topK?: number; rechtsgebiet?: string; gesetz?: string } = {},
): Promise<SearchResponse> {
  return hole<SearchResponse>("/api/legal/search", {
    q: frage,
    top_k: optionen.topK ?? 10,
    rechtsgebiet: optionen.rechtsgebiet,
    gesetz: optionen.gesetz,
  });
}

/**
 * Allgemeine Rechtsfrage mit belegter Antwort. Kein Falltext.
 *
 * `enhanced` statt `ask`: der Endpunkt schreibt die Frage zusätzlich um,
 * führt mehrere Suchen zusammen und liefert das erkannte Rechtsgebiet mit —
 * für MVP 1 mit nur zwei Rechtsgebieten ist genau das die nützliche Auskunft.
 */
export function frageRecht(frage: string, topK = 5): Promise<EnhancedAskResponse> {
  return hole<EnhancedAskResponse>("/api/legal/ask/enhanced", { q: frage, top_k: topK });
}

export function engineStatistik(): Promise<EngineStats> {
  return hole<EngineStats>("/api/legal/stats", {});
}

/**
 * Die rechtliche Einordnung eines konkreten Falls.
 *
 * Der Falltext verlässt das Gerät hier ausdrücklich **nicht** in Richtung
 * Engine, sondern in Richtung Supabase: die Edge Function `fall-einordnen`
 * kennt die Engine-Adresse, prüft das Nutzertoken, löst den Fall auf und legt
 * Analyse und Fundstellen in der Akte ab. Der Client schickt nur die ID.
 *
 * Die Funktion ist noch nicht deployt — dieser Aufruf ist die Naht, an der sie
 * andockt. Bis dahin meldet Supabase einen Fehler, und der Bildschirm zeigt
 * ihn als "noch nicht angeschlossen" statt eine Analyse vorzutäuschen.
 */
export async function fallEinordnen(caseId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("fall-einordnen", {
    body: { case_id: caseId },
  });
  if (error) throw new EngineFehler("Die Einordnung ist noch nicht angeschlossen.");
}
