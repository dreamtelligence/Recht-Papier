import type { CaseDetail, CaseDocument } from "./typen";

export function analyseLaeuft(fall: Pick<CaseDetail, "status" | "run_expires_at">, jetzt = Date.now()): boolean {
  return fall.status === "in_pruefung" && Boolean(fall.run_expires_at) && Date.parse(fall.run_expires_at!) > jetzt;
}

/** Neue Uploads kurz nachladen; unbekannte Dauerzustände bleiben als erneuter Leseversuch sichtbar. */
export function dokumentLesenAusstehend(dokumente: Pick<CaseDocument, "processed_at" | "created_at">[], jetzt = Date.now()): boolean {
  return dokumente.some(d => !d.processed_at && jetzt - Date.parse(d.created_at) < 60_000);
}
