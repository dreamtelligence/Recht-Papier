import { createClient } from "jsr:@supabase/supabase-js@2";
import { legalAnswer } from "../_shared/legal-answer.ts";

/**
 * Rechtsfrage nachschlagen — der einzige Weg der App zur Legal-Engine.
 *
 * Warum diese Funktion überhaupt existiert: Die App kann die Engine nicht
 * direkt fragen. Die Engine verlangt einen Schlüssel, und ein Schlüssel in
 * einem Mobile-Bundle ist keiner — er lässt sich in Minuten herauslösen. Ohne
 * Schlüssel wiederum stünde die Engine offen im Netz, und `/ask` startet einen
 * kostenpflichtigen LLM-Aufruf. Diese Funktion hält den Schlüssel und prüft
 * davor, ob überhaupt jemand Angemeldetes fragt.
 *
 * Was hier ausdrücklich **nicht** hingehört: Falltext. Diese Route ist für
 * allgemeine Rechtsfragen ohne Sachverhalt — "Wie lang ist die
 * Kündigungsfrist nach zehn Jahren?". Der Sachverhalt eines konkreten Falls
 * läuft über `fall-einordnen`, weil er pseudonymisiert und in die Akte
 * geschrieben werden muss.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

// Die Engine lädt beim ersten Aufruf ein Einbettungsmodell und einen 211 MB
// grossen Index. Ein Kaltstart dauert daher deutlich länger als jede normale
// Anfrage — 20 Sekunden Zeitlimit würden ihn zuverlässig abschneiden.
const ZEITLIMIT_MS = 120_000;

const MAX_FRAGE = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const engineUrl = (Deno.env.get("LEGAL_ENGINE_URL") ?? "").replace(/\/+$/, "");
  const engineKey = Deno.env.get("LEGAL_ENGINE_API_KEY") ?? "";

  if (!engineUrl) {
    // Konfigurationsfehler klar von Nutzerfehlern trennen — sonst sucht
    // jemand den Fehler in seiner Frage.
    return json({ error: "Die Rechtsdatenbank ist nicht konfiguriert." }, 503);
  }

  // Identität kommt aus dem Token, nie aus dem Body. Dieselbe Regel wie in
  // `delete-account`: alles andere wäre eine Einladung.
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

  let frage = "";
  try {
    const body = await req.json();
    frage = String(body?.frage ?? "").trim();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }

  if (frage.length < 5) return json({ error: "Bitte stellen Sie eine vollständige Frage." }, 400);
  if (frage.length > MAX_FRAGE) {
    return json({ error: `Die Frage darf höchstens ${MAX_FRAGE} Zeichen lang sein.` }, 400);
  }

  const ziel = new URL(`${engineUrl}/api/legal/analyze`);

  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
  try {
    const headers = { Accept: "application/json", ...(engineKey ? { "X-Engine-Key": engineKey } : {}) };
    let antwort = await fetch(ziel, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ sachverhalt: frage, frage, top_k: 5 }),
      redirect: "manual",
      signal: abbruch.signal,
    });
    // Modal's 303 points to the result of this request, not a new analysis.
    // Follow only that same-origin/path result URL; never forward private text or keys elsewhere.
    for (let redirects = 0; antwort.status === 303 && redirects < 3; redirects++) {
      const location = antwort.headers.get("Location");
      if (!location) throw new Error("Missing result URL");
      const resultUrl = new URL(location, ziel);
      if (resultUrl.origin !== ziel.origin || resultUrl.pathname !== ziel.pathname ||
        !resultUrl.searchParams.has("__modal_attempt_token") ||
        [...resultUrl.searchParams.keys()].some(key => key !== "__modal_attempt_token")) {
        throw new Error("Unexpected result URL");
      }
      antwort = await fetch(resultUrl, { method: "GET", headers, redirect: "manual", signal: abbruch.signal });
    }

    if (antwort.status === 401) {
      return json({ error: "Die Rechtsdatenbank weist uns ab." }, 502);
    }
    if (!antwort.ok) {
      return json({ error: "Die Rechtsdatenbank antwortet gerade nicht." }, 502);
    }

    const roh = await antwort.text();
    if (!roh) {
      // Genau das Bild, das eine nicht verfolgte Weiterleitung hinterlässt.
      // Als Fehler behandeln statt als leere Antwort — sonst zeigt die App
      // eine leere Einschätzung an, als wäre sie das Ergebnis.
      return json({ error: "Die Rechtsdatenbank lieferte keine Antwort." }, 502);
    }

    let daten: Record<string, unknown>;
    try {
      daten = JSON.parse(roh);
    } catch {
      return json({ error: "Die Rechtsdatenbank antwortete unverständlich." }, 502);
    }

    // The consumer boundary independently verifies the complete engine release contract.
    return json(legalAnswer(daten));
  } catch (fehler) {
    const abgebrochen = fehler instanceof DOMException && fehler.name === "AbortError";
    return json(
      { error: abgebrochen ? "Die Antwort hat zu lange gedauert." : "Das hat nicht geklappt." },
      504,
    );
  } finally {
    clearTimeout(uhr);
  }
});
