import { supabase } from "@/lib/supabase";

/**
 * Die Anmeldung, als Funktionen ohne Oberfläche.
 *
 * Jede wirft im Fehlerfall. Die Übersetzung in einen lesbaren Satz macht
 * `beschreibeAuthFehler`, nicht diese Ebene — hier bleibt der Originalfehler
 * erhalten, damit der Aufrufer noch entscheiden kann (etwa die Sperrfrist
 * auslesen, statt nur "hat nicht geklappt" anzuzeigen).
 */

function normalisiert(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sechsstelligen Code anfordern.
 *
 * `shouldCreateUser: true` ist Absicht und keine Bequemlichkeit: bekannte und
 * unbekannte Adressen bekommen dieselbe Antwort. Mit `false` verriete die
 * Fehlermeldung, zu welcher Adresse ein Konto existiert.
 */
export async function codeAnfordern(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: normalisiert(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Dieselbe normalisierte Adresse wie beim Anfordern — sonst findet Supabase den Code nicht. */
export async function codeBestaetigen(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: normalisiert(email),
    token: code.trim(),
    type: "email",
  });
  if (error) throw error;
}

/**
 * Zweitweg für Bestandskonten.
 *
 * Neue Konten entstehen ausschließlich über den Code — niemand muss mehr ein
 * Passwort setzen. Bestehende funktionieren weiter, deshalb bleibt der Weg.
 */
export async function mitPasswortAnmelden(email: string, passwort: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalisiert(email),
    password: passwort,
  });
  if (error) throw error;
}

export async function abmelden(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Konto, Fallakte und Dokumente vollständig löschen.
 *
 * Apple verlangt das aus der App heraus, sobald sie Konten anlegt
 * (Guideline 5.1.1(v)). Die eigentliche Arbeit macht die Edge Function: sie
 * braucht den `service_role`-Schlüssel, der nie auf ein Gerät gehört. Der
 * Client schickt nur sein normales Nutzertoken mit.
 */
export async function kontoLoeschen(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account");
  if (error) throw error;
  if (!data?.deleted) throw new Error("unerwartete Antwort der Löschfunktion");

  // Das Konto existiert nicht mehr; ein serverseitiges Abmelden liefe ins
  // Leere. Nur die lokale Sitzung räumen.
  await supabase.auth.signOut({ scope: "local" });
}
