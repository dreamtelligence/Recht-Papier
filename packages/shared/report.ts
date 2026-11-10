import type { Result } from "./contract.ts";
import { displayValue, FACT_LABELS } from "./termination.ts";

export function reportText(result: Result): string {
  const references = (ids: string[]) => ids.map(id => result.sources.find(source => source.id === id)?.reference ?? id).join("; ");
  const chronology = result.facts.filter((f) => f.key.endsWith("_on")).sort((a, b) =>
    a.value.localeCompare(b.value)
  );
  return [
    "Recht & Papier · Bericht zur Fallakte",
    "Fiktives Portfolio-Beispiel · keine Rechtsberatung und keine anwaltliche Freigabe.",
    `Anliegen: Ordentliche Arbeitgeberkündigung aus Arbeitnehmersicht.\nAnalysestichtag: ${result.as_of}\nErgebnisformat: ${result.version} · Quellenstand: ${result.corpus_version}`,
    "Bestätigte Tatsachen und Belegstellen",
    ...result.facts.map((f) =>
      `${FACT_LABELS[f.key]}: ${
        displayValue(f.value)
      }\nBeleg: ${f.evidence.document_id}, Seite ${f.evidence.page}: „${f.evidence.quote}“`
    ),
    "Chronologie",
    ...chronology.map((f) => `${f.value} · ${FACT_LABELS[f.key]}`),
    "Berechnungen und Voraussetzungen",
    ...(result.calculations.length
      ? result.calculations.map((c) =>
        `${
          c.kind === "notice_end"
            ? "Gesetzlicher Vergleichstermin"
            : "Klagefrist im unterstützten Grundfall"
        }: ${c.due_on}\n${c.method}\nVoraussetzungen: ${c.assumptions.join(" ")}\nQuellen: ${
          references(c.source_ids)
        }`
      )
      : ["Keine sichere Fristberechnung aus den vorliegenden Angaben."]),
    "Rechtliche Prüfpunkte",
    ...result.checks.map((c) => `${c.statement}\nQuellen: ${references(c.source_ids)}`),
    "Fehlende Unterlagen und Fragen für das anwaltliche Gespräch",
    ...(result.uncertainties.length ? result.uncertainties : [
      "Originale, Kündigungsgrund und Anwendbarkeit des Kündigungsschutzes anwaltlich prüfen lassen.",
    ]),
    "Verwendete Quellen",
    ...result.sources.map((s) =>
      `${s.reference} · abgerufen ${s.retrieved_on}\n${s.url}`
    ),
    "Technische Prüfungen",
    "Schema, Belegstellen und unterstützte Rechenregeln geprüft. Nutzerbestätigung ist keine anwaltliche Prüfung. Freie Modellschlussfolgerungen sind nicht freigegeben.",
    ...(result.model_review.status === "rejected"
      ? ["Zusätzliche Modellformulierung verworfen.", ...result.model_review.issues]
      : []),
  ].join("\n\n");
}

export function reportHtml(result: Result): string {
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  const headings = new Set([
    "Bestätigte Tatsachen und Belegstellen",
    "Chronologie",
    "Berechnungen und Voraussetzungen",
    "Rechtliche Prüfpunkte",
    "Fehlende Unterlagen und Fragen für das anwaltliche Gespräch",
    "Verwendete Quellen",
    "Technische Prüfungen",
  ]);
  const parts = reportText(result).split("\n\n").map((part) =>
    headings.has(part) ? `<h2>${escape(part)}</h2>` : `<p>${escape(part)}</p>`
  ).join("");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><title>Bericht zur Fallakte</title><style>@page{size:A4;margin:18mm}body{color:#262b27;font:10pt/1.45 Georgia,serif}p{white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid;margin:0 0 4mm}h1{font-size:22pt;margin:0 0 7mm}h2{font-size:14pt;border-bottom:1px solid #adb5a7;padding-bottom:2mm;margin:7mm 0 4mm;break-after:avoid}</style><h1>Recht &amp; Papier</h1>${parts}</html>`;
}
