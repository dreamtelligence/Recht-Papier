import { createClient } from "jsr:@supabase/supabase-js@2";

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
    headers: { ...cors, "Content-Type": "application/json" },
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

  const ziel = new URL(`${engineUrl}/api/legal/ask/enhanced`);
  ziel.searchParams.set("q", frage);
  ziel.searchParams.set("top_k", "5");

  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
  try {
    const antwort = await fetch(ziel, {
      headers: {
        Accept: "application/json",
        // Der Schlüssel wird nur gesetzt, wenn er konfiguriert ist. Die
        // Engine entscheidet, ob sie ihn verlangt — nicht diese Funktion.
        ...(engineKey ? { "X-Engine-Key": engineKey } : {}),
      },
      // Ausdrücklich, obwohl es der Standard ist: Modal beantwortet
      // langlaufende Anfragen mit `303 See Other` und einer Location auf
      // dieselbe URL plus `__modal_attempt_token`. Der erste Aufruf gegen
      // einen kalten Container läuft immer über diesen Weg, weil Modell und
      // Index erst geladen werden. Wer der Weiterleitung nicht folgt, bekommt
      // einen leeren Rumpf — und hält ihn womöglich für eine Antwort.
      //
      // Die Weiterleitung zeigt auf denselben Host, deshalb überlebt der
      // Schlüssel sie. Bei einem Wechsel auf einen anderen Host wäre das
      // anders: `fetch` entfernt Autorisierungs-Kopfzeilen bei
      // Host-Wechseln, und der zweite Aufruf käme unberechtigt an.
      redirect: "follow",
      signal: abbruch.signal,
    });

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

    // Nur weitergeben, was die App zeigt. Die Engine liefert zusätzlich
    // `retrieval_plan` und `source_audit` — interne Diagnose, die auf einem
    // Verbrauchergerät nichts zu suchen hat und nur Bandbreite kostet.
    return json({
      answer: (daten.answer as string) ?? "",
      citations: (daten.citations as unknown[]) ?? [],
      model: (daten.model as string) ?? "",
      rechtsgebiet: (daten.rechtsgebiet as string | null) ?? null,
      // Der Audit bleibt drin, aber reduziert: die App muss wissen, ob eine
      // Antwort unbelegte Aussagen enthält. Eine Antwort mit hoher
      // Beanstandung darf nicht wie eine geprüfte aussehen.
      audit: {
        status: (daten.answer_audit as Record<string, unknown> | undefined)?.status ?? "unknown",
        high_severity_count:
          (daten.answer_audit as Record<string, unknown> | undefined)?.high_severity_count ?? 0,
      },
    });
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
