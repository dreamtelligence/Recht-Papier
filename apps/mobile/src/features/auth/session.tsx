import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Die Anmeldung als einzige Wahrheit für die ganze App.
 *
 * Vorher fragte jeder Bildschirm Supabase selbst und hielt eine eigene Kopie
 * der Sitzung. Drei Kopien derselben Wahrheit heißt drei Momente, in denen sie
 * auseinanderlaufen kann — beim Start blitzte deshalb der Startbildschirm auf,
 * obwohl längst jemand angemeldet war. Hier gibt es genau eine Abfrage und
 * genau ein Abonnement; alles andere liest mit.
 *
 * `status` ist bewusst dreiwertig und nicht `session === null`: "wir wissen es
 * noch nicht" ist ein anderer Zustand als "niemand ist angemeldet", und nur mit
 * dieser Unterscheidung lässt sich der Startbildschirm zurückhalten, bis die
 * gespeicherte Sitzung gelesen ist.
 */
export type AuthStatus = "unbekannt" | "angemeldet" | "abgemeldet";

type SessionValue = {
  status: AuthStatus;
  session: Session | null;
  /** Kurzform für Routen-Guards. Vor `unbekannt` nie `true`. */
  angemeldet: boolean;
  /** Ohne Konfiguration kann die App nichts — der Grund gehört sichtbar gemacht. */
  konfiguriert: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    // Ohne Zugangsdaten kommt nie eine Antwort von Supabase. Dann sofort
    // "abgemeldet", sonst hinge die App für immer im Ladezustand.
    isSupabaseConfigured ? "unbekannt" : "abgemeldet",
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let aktiv = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!aktiv) return;
      setSession(data.session);
      setStatus(data.session ? "angemeldet" : "abgemeldet");
    });

    const { data } = supabase.auth.onAuthStateChange((_ereignis, naechste) => {
      setSession(naechste);
      setStatus(naechste ? "angemeldet" : "abgemeldet");
    });

    return () => {
      aktiv = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const wert = useMemo<SessionValue>(
    () => ({
      status,
      session,
      angemeldet: status === "angemeldet",
      konfiguriert: isSupabaseConfigured,
    }),
    [status, session],
  );

  return <SessionContext.Provider value={wert}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const wert = useContext(SessionContext);
  if (!wert) {
    // Ein Bildschirm ohne Provider würde stumm "niemand angemeldet" lesen und
    // die Fallakte verstecken. Lieber laut abbrechen als leise falsch liegen.
    throw new Error("useSession braucht den SessionProvider aus app/_layout.tsx");
  }
  return wert;
}

/**
 * Die angemeldete Nutzer-ID, wo ohne Anmeldung ohnehin nichts geht.
 *
 * Spart das `session!.user.id` in jedem Aufruf innerhalb von `(app)/`. Dass
 * dort eine Sitzung existiert, garantiert der Guard im Layout.
 */
export function useNutzerId(): string {
  const { session } = useSession();
  if (!session) throw new Error("Kein angemeldeter Nutzer in diesem Bereich");
  return session.user.id;
}
