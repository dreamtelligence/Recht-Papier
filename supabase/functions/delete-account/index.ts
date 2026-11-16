// Vollstaendige Kontoloeschung aus der App heraus.
//
// Apple verlangt sie, sobald eine App Konten anlegt (Guideline 5.1.1(v)), und
// Google Play zusaetzlich einen Weg ausserhalb der App. Deaktivieren genuegt
// beidem nicht.
//
// Warum das hier liegt und nicht im Client: Das Loeschen eines Auth-Kontos
// braucht den service_role-Schluessel. Der umgeht jede Row Level Security und
// darf ein Geraet nie erreichen. Die Funktion nimmt deshalb das normale
// Nutzertoken entgegen, loest daraus die Identitaet auf und benutzt die
// Vollmacht ausschliesslich serverseitig fuer genau dieses eine Konto.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "case-documents";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Identitaet aus dem mitgeschickten Token, nicht aus dem Request-Body. Eine
  // Nutzer-ID aus dem Body waere eine Einladung, fremde Konten zu loeschen.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

  const userId = userData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Commit the write fence before listing files; a still-valid JWT must not add an orphan during cleanup.
  const { data: fenced, error: fenceError } = await admin.rpc("begin_account_deletion", { p_owner: userId });
  if (fenceError || fenced !== true) return json({ error: "Die Kontolöschung konnte nicht sicher begonnen werden. Bitte erneut versuchen." }, 500);

  // Zuerst die Dateien. storage.objects haengt an keinem Fremdschluessel und
  // ueberlebt jede Cascade - ohne diesen Schritt bleiben die Originaldokumente
  // im Bucket liegen, waehrend das Konto verschwunden ist.
  const geloeschteDateien: string[] = [];
  const stack = [userId];
  while (stack.length) {
    const prefix = stack.pop()!;
    const eintraege: { id: string | null; name: string }[] = [];
    // Erst vollständig lesen, dann löschen: Offset während des Löschens würde Einträge überspringen.
    for (let offset = 0;; offset += 1000) {
      const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
      if (error) return json({ error: "Dateien konnten nicht gelesen werden." }, 500);
      eintraege.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const dateien: string[] = [];
    for (const eintrag of eintraege) {
      // Ordner melden sich ohne id; alles andere ist eine Datei.
      if (eintrag.id === null) stack.push(`${prefix}/${eintrag.name}`);
      else dateien.push(`${prefix}/${eintrag.name}`);
    }
    for (let index = 0; index < dateien.length; index += 1000) {
      const batch = dateien.slice(index, index + 1000);
      const { error: removeError } = await admin.storage.from(BUCKET).remove(batch);
      // Bewusster Abbruch: lieber ein noch bestehendes Konto als verwaiste
      // Falldokumente ohne Eigentuemer.
      if (removeError) return json({ error: "Dateien konnten nicht geloescht werden." }, 500);
      geloeschteDateien.push(...batch);
    }
  }
  const { data: rest, error: restError } = await admin.storage.from(BUCKET).list(userId, { limit: 1 });
  if (restError || rest?.length) return json({ error: "Die Dateien wurden zwischenzeitlich verändert. Bitte Löschung erneut versuchen." }, 409);

  // Erst jetzt das Konto. Profil, Faelle, Dokumentzeilen, Fakten, Analysen und
  // Quellen haengen per Fremdschluessel daran und gehen mit.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: "Konto konnte nicht geloescht werden." }, 500);

  return json({ deleted: true, files_removed: geloeschteDateien.length });
});
