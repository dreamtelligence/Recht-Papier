import type { CaseDetail } from "./typen";

export function analyseLaeuft(fall: Pick<CaseDetail, "status" | "run_expires_at">, jetzt = Date.now()): boolean {
  return fall.status === "in_pruefung" && Boolean(fall.run_expires_at) && Date.parse(fall.run_expires_at!) > jetzt;
}
