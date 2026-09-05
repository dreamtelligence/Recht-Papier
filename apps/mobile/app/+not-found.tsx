import { Redirect } from "expo-router";

import { useSession } from "@/features/auth/session";
import { Waiting } from "@/ui";

/**
 * Wo niemand landen sollte — und trotzdem jemand landet.
 *
 * Zwei Wege führen hierher, und beide sind echt: ein Deep Link auf eine
 * Fallakte, während niemand angemeldet ist (die geschützte Route existiert
 * dann gar nicht), und jede alte gespeicherte Adresse nach diesem Umbau.
 * Ohne diesen Bildschirm zeigt Expo Router seine Entwickler-Fehlerseite —
 * in einem Verbraucherprodukt der schlechtestmögliche Anblick.
 *
 * Statt einer Sackgasse geht es dorthin, wo der Zustand hingehört: in die App,
 * wenn jemand angemeldet ist, sonst auf den Startbildschirm.
 */
export default function NichtGefunden() {
  const { status, angemeldet } = useSession();

  // Solange die gespeicherte Sitzung noch gelesen wird, wäre jede Weiterleitung
  // geraten — und die falsche würde die Fallakte für einen Moment verstecken.
  if (status === "unbekannt") return <Waiting />;

  return <Redirect href={angemeldet ? "/" : "/start"} />;
}
