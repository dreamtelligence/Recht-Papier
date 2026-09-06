import { useCallback, useEffect, useState } from "react";

import { beschreibeAuthFehler, gesperrteSekunden } from "@/lib/fehler";
import { codeAnfordern, codeBestaetigen, mitPasswortAnmelden } from "./api";

/**
 * Der Ablauf der Anmeldung, ohne Oberfläche.
 *
 * Der Bildschirm soll entscheiden, wie etwas aussieht, nicht wann welcher
 * Schritt dran ist. Deshalb liegt der Ablauf hier: welcher Schritt gerade
 * gilt, ob die Sperrfrist läuft, welcher Satz angezeigt wird. Der Bildschirm
 * liest das nur ab.
 *
 * Nach erfolgreicher Anmeldung passiert hier bewusst nichts weiter — der
 * `SessionProvider` bekommt das Ereignis von Supabase und die Route wechselt
 * von selbst. Ein `router.replace` an dieser Stelle wäre eine zweite Wahrheit
 * neben dem Guard.
 */

export type Schritt = "email" | "code" | "passwort";

const CODE_LAENGE = 6;

export function useAnmeldung() {
  const [schritt, setSchritt] = useState<Schritt>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [passwort, setPasswort] = useState("");
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [sperrfrist, setSperrfrist] = useState(0);

  // Sperrfrist zwischen zwei Code-Anforderungen. Supabase drosselt ohnehin
  // serverseitig; das hier verhindert nur, dass die Oberfläche zu einer
  // Anforderung einlädt, die abgelehnt würde.
  useEffect(() => {
    if (sperrfrist <= 0) return;
    const uhr = setInterval(() => setSperrfrist((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(uhr);
  }, [sperrfrist]);

  const emailPlausibel = /\S+@\S+\.\S+/.test(email.trim());
  const kannCodeAnfordern = emailPlausibel && !beschaeftigt && sperrfrist === 0;
  const kannCodeBestaetigen = code.trim().length === CODE_LAENGE && !beschaeftigt;
  const kannMitPasswort = emailPlausibel && passwort.length >= 8 && !beschaeftigt;

  const anfordern = useCallback(async () => {
    if (!kannCodeAnfordern) return;
    setBeschaeftigt(true);
    setMeldung("");
    try {
      await codeAnfordern(email);
      setSchritt("code");
      setSperrfrist(60);
      setMeldung("Wenn die Adresse nutzbar ist, liegt gleich ein sechsstelliger Code im Postfach.");
    } catch (fehler) {
      const wartezeit = gesperrteSekunden(fehler);
      if (wartezeit > 0) {
        // Entscheidend: trotzdem auf die Codeeingabe wechseln. Wer in die
        // Sperre läuft, hat meist schon eine Mail bekommen — ohne diesen Zweig
        // sieht er den gültigen Code im Postfach und hat kein Feld dafür.
        setSchritt("code");
        setSperrfrist(wartezeit);
        setMeldung(`Ein Code ist bereits unterwegs. Neuer Code in ${wartezeit} Sekunden.`);
      } else {
        setMeldung(beschreibeAuthFehler(fehler));
      }
    } finally {
      setBeschaeftigt(false);
    }
  }, [email, kannCodeAnfordern]);

  const bestaetigen = useCallback(async () => {
    if (!kannCodeBestaetigen) return;
    setBeschaeftigt(true);
    setMeldung("");
    try {
      await codeBestaetigen(email, code);
      setCode("");
    } catch (fehler) {
      setMeldung(beschreibeAuthFehler(fehler));
    } finally {
      setBeschaeftigt(false);
    }
  }, [code, email, kannCodeBestaetigen]);

  const mitPasswort = useCallback(async () => {
    if (!kannMitPasswort) return;
    setBeschaeftigt(true);
    setMeldung("");
    try {
      await mitPasswortAnmelden(email, passwort);
    } catch (fehler) {
      setMeldung(beschreibeAuthFehler(fehler));
    } finally {
      setBeschaeftigt(false);
    }
  }, [email, kannMitPasswort, passwort]);

  const zuSchritt = useCallback((ziel: Schritt) => {
    setSchritt(ziel);
    setMeldung("");
    if (ziel !== "code") setCode("");
    if (ziel !== "passwort") setPasswort("");
  }, []);

  return {
    schritt,
    zuSchritt,
    email,
    setEmail,
    // Nur Ziffern, höchstens sechs: das Feld nimmt gar nicht erst an, was der
    // Server ohnehin ablehnen würde.
    code,
    setCode: useCallback(
      (roh: string) => setCode(roh.replace(/[^0-9]/g, "").slice(0, CODE_LAENGE)),
      [],
    ),
    passwort,
    setPasswort,
    beschaeftigt,
    meldung,
    sperrfrist,
    emailPlausibel,
    kannCodeAnfordern,
    kannCodeBestaetigen,
    kannMitPasswort,
    anfordern,
    bestaetigen,
    mitPasswort,
  };
}
