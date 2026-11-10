import type { Calculation, Fact, Input, Result, Source } from "./contract.ts";

export const FACT_LABELS: Record<Fact["key"], string> = {
  scope: "Art der Kündigung",
  receipt_on: "Zugang am",
  employment_started_on: "Beschäftigt seit",
  stated_end_on: "Genanntes Vertragsende",
  notice_regime: "Vertrag und Tarif geprüft",
  probation: "Probezeit",
  written_notice: "Schriftliches Original erhalten",
  special_protection: "Behördliche Zustimmung / Sonderkündigungsschutz",
  court_state: "Bundesland des Arbeitsgerichts",
  representative_authority: "Vollmacht",
  works_council: "Betriebsratsanhörung",
};

export const VALUE_LABELS: Record<string, string> = {
  ordinary_employer: "Ordentliche Arbeitgeberkündigung",
  other: "Anderer Fall",
  unknown: "Unbekannt",
  statutory: "Gesetzliche Frist, keine abweichende Vertrags- oder Tarifregel",
  contractual: "Abweichende Vertragsregel",
  tariff: "Tarifregel",
  yes: "Ja",
  no: "Nein",
  NW: "Nordrhein-Westfalen",
  attached: "Vollmacht beigefügt",
  missing: "Vollmacht fehlt",
  heard: "Anhörung angegeben",
  not_heard: "Keine Anhörung angegeben",
  not_present: "Kein Betriebsrat",
};
export const displayValue = (value: string) => VALUE_LABELS[value] ?? value;

export const FACT_OPTIONS: Partial<Record<Fact["key"], string[]>> = {
  scope: ["ordinary_employer", "other", "unknown"],
  notice_regime: ["statutory", "contractual", "tariff", "unknown"],
  probation: ["yes", "no", "unknown"],
  written_notice: ["yes", "no", "unknown"],
  special_protection: ["yes", "no", "unknown"],
  court_state: ["NW", "other", "unknown"],
  representative_authority: ["attached", "missing", "unknown"],
  works_council: ["heard", "not_heard", "not_present", "unknown"],
};

/** The curated PDFs use explicit labels; arbitrary prose requires manual confirmation. */
export function extractTerminationFacts(documents: EvidenceDocument[]): Fact[] {
  const facts: Fact[] = [];
  const labels = Object.values(FACT_LABELS).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(`(${labels}):\\s*(.*?)(?=\\s+(?:${labels}):|$)`, "gs");
  for (const doc of documents) {
    for (const [index, page] of (doc.extracted_pages ?? []).entries()) {
      for (const match of page.matchAll(pattern)) {
        const key = Object.entries(FACT_LABELS).find(([, label]) => label === match[1])![0];
        const raw = normalized(match[2]);
        const value = Object.entries(VALUE_LABELS).find(([, text]) => text === raw)?.[0] ?? raw;
        if (value) {
          facts.push({
            key: key as Fact["key"],
            value,
            confirmed: false,
            evidence: { document_id: doc.id, page: index + 1, quote: match[0].trim() },
          });
        }
      }
    }
  }
  return facts;
}

export type EvidenceDocument = { id: string; extracted_text: string; extracted_pages?: string[] };
export type Corpus = { version: string; sources: Source[] };

export function dateValue(value: string): Date {
  const date = new Date(`${value}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Ungültiges Kalenderdatum: ${value}`);
  }
  return date;
}
const iso = (date: Date) => date.toISOString().slice(0, 10);
const days = (value: string, count: number) => {
  const date = dateValue(value);
  date.setUTCDate(date.getUTCDate() + count);
  return iso(date);
};
const normalized = (s: string) => s.replace(/\s+/g, " ").trim();

// shortcut: NRW calendars 2026/2027 only; extend with primary-source verification before supporting other years or states.
const HOLIDAYS: Record<number, string[]> = {
  2026: [
    "01-01",
    "04-03",
    "04-06",
    "05-01",
    "05-14",
    "05-25",
    "06-04",
    "10-03",
    "11-01",
    "12-25",
    "12-26",
  ],
  2027: [
    "01-01",
    "03-26",
    "03-29",
    "05-01",
    "05-06",
    "05-17",
    "05-27",
    "10-03",
    "11-01",
    "12-25",
    "12-26",
  ],
};

function nextCourtDay(value: string): string | null {
  let date = value;
  for (let i = 0; i < 8; i++, date = days(date, 1)) {
    const calendar = HOLIDAYS[Number(date.slice(0, 4))];
    if (!calendar) return null;
    const day = dateValue(date).getUTCDay();
    if (day !== 0 && day !== 6 && !calendar.includes(date.slice(5))) return date;
  }
  return null;
}

function noticeEnd(receipt: string, start: string): { due: string; method: string } {
  const received = dateValue(receipt), began = dateValue(start);
  let years = received.getUTCFullYear() - began.getUTCFullYear();
  if (receipt.slice(5) < start.slice(5)) years--;
  const levels = [[20, 7], [15, 6], [12, 5], [10, 4], [8, 3], [5, 2], [2, 1]];
  const level = levels.find(([minimum]) => years >= minimum);
  if (level) {
    const end = new Date(
      Date.UTC(received.getUTCFullYear(), received.getUTCMonth() + level[1] + 1, 0, 12),
    );
    return {
      due: iso(end),
      method: `${years} volle Beschäftigungsjahre bei Zugang → ${
        level[1]
      } Monat(e) zum Monatsende (§ 622 Abs. 2 BGB). Kein Verschieben des Kündigungstermins wegen Wochenenden oder Feiertagen.`,
    };
  }
  const earliest = days(receipt, 28);
  const date = dateValue(earliest);
  const due = date.getUTCDate() <= 15
    ? `${earliest.slice(0, 7)}-15`
    : iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)));
  return {
    due,
    method:
      `Zugangstag nicht mitgezählt → 28 Kalendertage → nächster 15. oder Monatsletzter (§ 622 Abs. 1, §§ 187, 188 BGB).`,
  };
}

/** Only confirmed values with document evidence become calculation inputs. */
export function analyzeTermination(
  input: Input,
  documents: EvidenceDocument[],
  corpus: Corpus,
): Result {
  dateValue(input.as_of);
  const uncertainties: string[] = [];
  const facts = input.facts.filter((f) => f.confirmed);
  const values = new Map<Fact["key"], string>();
  const conflicts = new Set<Fact["key"]>();
  const allowed = FACT_OPTIONS;
  for (const fact of facts) {
    const doc = documents.find((d) => d.id === fact.evidence.document_id);
    // Old extracted text has no verified page boundaries: reread rather than invent page evidence.
    const page = doc?.extracted_pages?.[fact.evidence.page - 1];
    if (!doc || !page || !normalized(page).includes(normalized(fact.evidence.quote))) {
      throw new Error(
        `Belegstelle für „${
          FACT_LABELS[fact.key]
        }“ ist nicht auf der angegebenen Dokumentseite vorhanden.`,
      );
    }
    if (fact.key.endsWith("_on")) dateValue(fact.value);
    if (allowed[fact.key] && !allowed[fact.key]!.includes(fact.value)) {
      throw new Error(`Ungültiger Wert für ${fact.key}`);
    }
    if (values.has(fact.key) && values.get(fact.key) !== fact.value) conflicts.add(fact.key);
    values.set(fact.key, fact.value);
  }
  for (const key of conflicts) {
    values.delete(key);
    uncertainties.push(
      `Widersprüchliche bestätigte Angaben: ${
        FACT_LABELS[key]
      }. Bitte anhand der Originale klären.`,
    );
  }
  const get = (key: Fact["key"]) => values.get(key);
  const sources = corpus.sources;
  const needed = [
    "BGB_130",
    "BGB_174",
    "BGB_187",
    "BGB_188",
    "BGB_622",
    "BGB_623",
    "KSchG_1",
    "KSchG_4",
    "KSchG_5",
    "KSchG_7",
    "KSchG_23",
    "BetrVG_102",
    "ZPO_222",
    "ArbGG_46",
    "FeiertG_NW_2",
  ];
  if (
    needed.some((id) =>
      !sources.some((s) => s.id === id && s.text.trim() && s.sha256.length === 64)
    )
  ) throw new Error("Der versionierte Rechtsbestand ist unvollständig.");
  const calculations: Calculation[] = [];
  const scope = get("scope") === "ordinary_employer";
  if (!scope) {
    uncertainties.push(
      "Bitte bestätigen: ordentliche Kündigung durch den Arbeitgeber. Andere Kündigungsarten werden nicht berechnet.",
    );
  }
  const receipt = get("receipt_on");
  const start = get("employment_started_on");
  if (!receipt) {
    uncertainties.push(
      "An welchem Tag ist das Kündigungsschreiben tatsächlich zugegangen? Datum auf dem Schreiben genügt nicht.",
    );
  }
  const chronological = !!receipt && receipt <= input.as_of && (!start || start <= receipt);
  if (receipt && !chronological) {
    uncertainties.push(
      "Chronologie unplausibel: Zugang nach dem Analysestichtag oder Beschäftigungsbeginn nach Zugang. Keine Fristberechnung.",
    );
  }
  const noConflict = conflicts.size === 0;
  if (scope && receipt && chronological && noConflict) {
    if (
      get("written_notice") === "yes" && get("special_protection") === "no" &&
      get("court_state") === "NW"
    ) {
      const nominal = days(receipt, 21);
      const deadline = nextCourtDay(nominal);
      if (deadline) {
        calculations.push({
          kind: "claim_deadline",
          due_on: deadline,
          method:
            `${receipt} + drei Wochen = ${nominal}; danach ggf. nächster Werktag am Arbeitsgericht in NRW = ${deadline}. Zugangstag nicht mitgezählt.`,
          fact_keys: ["scope", "receipt_on", "written_notice", "special_protection", "court_state"],
          source_ids: ["KSchG_4", "BGB_187", "BGB_188", "ZPO_222", "ArbGG_46", "FeiertG_NW_2"],
          assumptions: [
            "Zugang eines schriftlichen Originals bestätigt.",
            "Keine behördliche Zustimmung und kein Sonderkündigungsschutz laut bestätigter Angabe.",
            "Zuständiges Arbeitsgericht in NRW; Feiertagskalender ausschließlich 2026/2027.",
            "Sonderfälle und nachträgliche Klagezulassung nicht entschieden.",
          ],
        });
      } else {uncertainties.push(
          "Klagefrist außerhalb des unterstützten NRW-Feiertagskalenders 2026/2027.",
        );}
    } else {uncertainties.push(
        "Klagefrist offen: schriftliches Original, Sonderkündigungsschutz/Behördenzustimmung und Gerichtsstand NRW müssen geklärt sein. Fristfrage dringend anwaltlich klären.",
      );}
    if (
      start && get("notice_regime") === "statutory" && get("probation") === "no" &&
      get("special_protection") === "no"
    ) {
      const calculated = noticeEnd(receipt, start);
      calculations.push({
        kind: "notice_end",
        due_on: calculated.due,
        method: calculated.method,
        fact_keys: [
          "scope",
          "receipt_on",
          "employment_started_on",
          "notice_regime",
          "probation",
          "special_protection",
        ],
        source_ids: ["BGB_622", "BGB_187", "BGB_188"],
        assumptions: [
          "Gesetzliche Grundregel: keine abweichenden Vertrags- oder Tariffristen bestätigt.",
          "Keine Probezeit und kein Sonderfall laut bestätigten Angaben.",
          "Nur Fristvergleich; keine Entscheidung über die Wirksamkeit der Kündigung.",
        ],
      });
    } else {uncertainties.push(
        "Kündigungstermin offen: Beschäftigungsbeginn, Probezeit, Sonderfälle und abweichende Vertrags-/Tarifregeln klären.",
      );}
  }
  const checks: Result["checks"] = [
    {
      code: "scope",
      statement:
        "Diese Prüfung entscheidet nicht über die Wirksamkeit der Kündigung. Sozialauswahl, Kündigungsgrund und Sonderkündigungsschutz sind nicht abschließend geprüft.",
      source_ids: ["KSchG_1", "KSchG_23"],
    },
    {
      code: "written_form",
      statement:
        "Die Beendigung durch Kündigung erfordert Schriftform; die elektronische Form ist ausgeschlossen. Das Original muss gesondert geprüft werden.",
      source_ids: ["BGB_623"],
    },
  ];
  const notice = calculations.find((c) => c.kind === "notice_end");
  const stated = get("stated_end_on");
  if (notice && stated) {
    checks.push({
      code: "notice_comparison",
      statement: stated < notice.due_on
        ? `Das genannte Vertragsende ${stated} liegt vor dem berechneten gesetzlichen Vergleichstermin ${notice.due_on}. Auslegung und Rechtsfolgen anwaltlich klären.`
        : `Das genannte Vertragsende ${stated} liegt nicht vor dem berechneten gesetzlichen Vergleichstermin ${notice.due_on}. Dies bestätigt ausschließlich den Datumsvergleich.`,
      source_ids: ["BGB_622"],
    });
  }
  if (get("representative_authority") !== "attached") {
    uncertainties.push(
      "Wer hat unterschrieben, wurde eine Originalvollmacht vorgelegt oder die Bevollmächtigung mitgeteilt? Voraussetzungen und unverzügliche Zurückweisung nach § 174 BGB anwaltlich klären; keine starre Tagesfrist berechnet.",
    );
    checks.push({
      code: "authority",
      statement:
        "Eine fehlende Vollmachtsurkunde allein erlaubt keine pauschale Aussage zur Wirksamkeit; § 174 BGB enthält weitere Voraussetzungen und eine Ausnahme.",
      source_ids: ["BGB_174"],
    });
  }
  if (get("works_council") !== "not_present") {
    uncertainties.push(
      "Existiert ein Betriebsrat und was wurde wann angehört? Fehlende Unterlagen beweisen keine unterlassene Anhörung. Anhörungsunterlagen anfordern.",
    );
    checks.push({
      code: "hearing",
      statement:
        "§ 102 BetrVG sieht die Anhörung eines bestehenden Betriebsrats vor. Ob die Anforderungen hier erfüllt wurden, bleibt offen.",
      source_ids: ["BetrVG_102"],
    });
  }
  if (calculations.some((c) => c.kind === "claim_deadline" && c.due_on < input.as_of)) {
    uncertainties.push(
      "Der berechnete Klagefristtermin liegt vor dem Stichtag. Sofort anwaltlich klären, ob ein Sonderfall oder nachträgliche Zulassung in Betracht kommt (§§ 4, 5, 7 KSchG).",
    );
  }
  return {
    version: "1.0",
    mode: "controlled",
    as_of: input.as_of,
    corpus_version: corpus.version,
    facts,
    calculations,
    checks,
    uncertainties,
    sources,
    technical_status: "pass",
    model_review: { status: "not_used", issues: [] },
  };
}

/** Free model conclusions stay blocked; citations cannot override arithmetic. */
// shortcut: catches observed prose patterns only; require structured verified propositions before approving any model narrative.
export function modelContradictions(answer: string, result: Result): string[] {
  const issues: string[] = [];
  for (const sentence of answer.split(/\n|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)) {
    if (!/frist|vertragsende|kündigungstermin|endet|enden|fristgerecht/i.test(sentence)) continue;
    const dates = [...sentence.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)].map((m) =>
      `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
    );
    const expected = result.calculations.map((c) => c.due_on);
    const factDates = result.facts.filter((f) => f.key.endsWith("_on")).map((f) => f.value);
    if (dates.some((d) => !expected.includes(d) && !factDates.includes(d))) {
      issues.push("Modell nennt ein nicht berechnetes Fristdatum.");
    }
    const notice = result.calculations.find((c) => c.kind === "notice_end");
    const stated = result.facts.find((f) => f.key === "stated_end_on")?.value;
    if (
      notice && stated && stated < notice.due_on &&
      /fristgerecht|frist eingehalten/i.test(sentence) &&
      !/nicht fristgerecht|nicht eingehalten/i.test(sentence)
    ) issues.push("Modell bezeichnet einen zu frühen Kündigungstermin als fristgerecht.");
  }
  return [...new Set(issues)];
}
