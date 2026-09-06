import { useCallback, useEffect, useRef, useState } from "react";

import { deleteCase, loadCaseOverview, loadCases } from "./api";
import { KEIN_NETZ, istNetzfehler } from "@/lib/fehler";
import type { CaseOverview, CaseSummary } from "./typen";

/**
 * Laden, Fehler, Nachladen — einmal, statt in jedem Bildschirm neu.
 *
 * Jeder Bildschirm hatte vorher dieselben vier `useState` und dasselbe
 * `active`-Flag im Effekt. Viermal dieselbe Mechanik ist viermal die
 * Gelegenheit, das Aufräumen zu vergessen und nach dem Verlassen des
 * Bildschirms in einen abgebauten Zustand zu schreiben.
 *
 * Bewusst kein React Query: eine Abhängigkeit dieser Größe rechnet sich erst
 * mit Cache-Invalidierung über mehrere Ansichten auf dieselben Daten. Sobald
 * die Fallakte so weit ist, ist das hier die eine Stelle, die getauscht wird.
 */
function useLadeVorgang<T>(laden: () => Promise<T>, fehlertext: string) {
  const [daten, setDaten] = useState<T | null>(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(true);
  const [aktualisiert, setAktualisiert] = useState(false);

  // Der Bildschirm kann verlassen werden, während die Abfrage noch läuft.
  // Ohne diese Sperre schreibt die zurückkommende Antwort in einen Zustand,
  // den es nicht mehr gibt.
  const montiert = useRef(true);
  useEffect(() => {
    montiert.current = true;
    return () => {
      montiert.current = false;
    };
  }, []);

  const abrufen = useCallback(async () => {
    try {
      const wert = await laden();
      if (!montiert.current) return;
      setDaten(wert);
      setFehler("");
    } catch (ausnahme) {
      // Kein Durchreichen der Rohmeldung: bei einer fremden ID antwortet die
      // Datenbank wegen RLS mit "nicht gefunden", und genau so soll es auch
      // aussehen. Ob es den Datensatz gibt, geht niemanden etwas an.
      //
      // Ein Netzausfall ist davon ausgenommen. "Diese Fallakte ist nicht
      // verfügbar" liest sich wie gelöscht oder gesperrt; ohne Empfang ist das
      // schlicht die falsche Auskunft.
      if (montiert.current) setFehler(istNetzfehler(ausnahme) ? KEIN_NETZ : fehlertext);
    } finally {
      if (montiert.current) {
        setLaedt(false);
        setAktualisiert(false);
      }
    }
  }, [laden, fehlertext]);

  useEffect(() => {
    setLaedt(true);
    abrufen();
  }, [abrufen]);

  const aktualisieren = useCallback(() => {
    setAktualisiert(true);
    abrufen();
  }, [abrufen]);

  return { daten, setDaten, fehler, laedt, aktualisiert, aktualisieren };
}

export function useFaelle(userId: string) {
  const laden = useCallback(() => loadCases(userId), [userId]);
  const { daten, setDaten, ...rest } = useLadeVorgang<CaseSummary[]>(
    laden,
    "Die Fallakten konnten nicht geladen werden.",
  );

  /**
   * Fall löschen und aus der Liste nehmen.
   *
   * Die Zeile verschwindet erst, wenn der Server bestätigt hat, nicht schon
   * beim Wischen. Optimistisch wäre hier falsch: Verschwindet eine Fallakte
   * sofort und schlägt die Löschung fehl, hat jemand gesehen, wie seine Akte
   * gelöscht wurde — und sie ist trotzdem noch da.
   */
  const entfernen = useCallback(
    async (id: string) => {
      await deleteCase(id);
      setDaten((bisher) => (bisher ?? []).filter((fall) => fall.id !== id));
    },
    [setDaten],
  );

  return { faelle: daten ?? [], entfernen, ...rest };
}

export function useFall(caseId: string) {
  const laden = useCallback(() => loadCaseOverview(caseId), [caseId]);
  const { daten, setDaten: _setDaten, ...rest } = useLadeVorgang<CaseOverview>(
    laden,
    "Diese Fallakte ist nicht verfügbar.",
  );
  return { fall: daten, ...rest };
}
