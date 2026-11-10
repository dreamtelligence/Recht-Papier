import { useEffect, useState } from "react";
import type { Fact, Result } from "@portfolio/contract";
import { displayValue, FACT_LABELS } from "@portfolio/termination";
import rawDemos from "./demo-data.json";
import ProductStory from "./ProductStory.web";
import "./portfolio.css";

type Demo = {
  id: string;
  title: string;
  input: { as_of: string; facts: Fact[] };
  documents: { extracted_text: string }[];
  result: Result;
};
const demos = rawDemos as Demo[];
const STORAGE_KEY = "recht-papier-public-demo-v1";
const descriptions = [
  "Vollständige Angaben. Der genannte Termin passt nicht zur gesetzlichen Vergleichsfrist.",
  "Der Zugangstag und weitere Angaben fehlen. Die Prüfung stellt gezielte Rückfragen.",
  "Zwei Belege nennen unterschiedliche Zugangstage. Eine sichere Berechnung bleibt aus.",
];
const references = (result: Result, ids: string[]) =>
  ids.map((id) =>
    result.sources.find((source) => source.id === id)?.reference ?? id
  ).join(" · ");
const dates = (value: string) => value.split("-").reverse().join(".");

export default function PublicDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [legal, setLegal] = useState<"impressum" | "datenschutz" | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      const example = demos.find((d) => d.id === saved?.selected);
      if (example) {
        const checked = Array.isArray(saved.confirmed)
          ? [
            ...new Set<number>(saved.confirmed.filter((n: unknown) =>
              Number.isInteger(n) && Number(n) >= 0 &&
              Number(n) < example.input.facts.length
            )),
          ]
          : [];
        const next = [1, 2, 3].includes(saved.step) ? saved.step : 1;
        setSelected(example.id);
        setConfirmed(checked);
        setStep(
          next === 3 &&
            !example.input.facts.every((_, i) => checked.includes(i))
            ? 2
            : next,
        );
      }
    } catch {
      setStorageError(true);
    }
  }, []);
  function save(id: string | null, next: number, checked: number[]) {
    setSelected(id);
    setStep(next);
    setConfirmed(checked);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selected: id, step: next, confirmed: checked }),
      );
    } catch {
      setStorageError(true);
    }
  }
  const demo = demos.find((d) => d.id === selected);
  const allConfirmed = !!demo &&
    demo.input.facts.every((_, i) => confirmed.includes(i));
  function go(next: number) {
    if (demo) save(demo.id, next, confirmed);
    document.getElementById("walkthrough")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  const canShowResult = step === 3 && allConfirmed;
  return (
    <div className="portfolio">
      <a className="skip-link" href="#inhalt">Zum Inhalt springen</a>
      <header className="site-header case-study-header">
        <a href="#" className="wordmark" onClick={() => setLegal(null)}>
          Recht <i>&amp;</i> Papier<span>Eine Produkt-Fallstudie</span>
        </a>
        <nav aria-label="Hauptnavigation">
          <a href="#produkt">Produkt</a>
          <a href="#ios-app">iOS-App</a>
          <a href="#gestaltung">UI/UX</a>
          <a href="#architektur">Entwicklung</a>
          <a href="#technische-demo">Technische Demo</a>
        </nav>
      </header>
      <main id="inhalt" tabIndex={-1}>
        <ProductStory />
        <section
          id="technische-demo"
          className="technical-demo"
          aria-labelledby="demo-heading"
        >
          <div className="section-top">
            <div>
              <p className="eyebrow">05 / TECHNISCHE DEMO</p>
              <h2 id="demo-heading">Technische Demo.</h2>
            </div>
            <p className="section-caption">
              Die Produktvision ist umfassender. Diese drei fiktiven Fälle
              zeigen den aktuell geprüften Teil: die ordentliche
              Arbeitgeberkündigung aus Arbeitnehmersicht.
            </p>
          </div>
          <div className="disclosure">
            <strong>Eine ehrliche Demo.</strong>{" "}
            Alle Fälle sind erfunden. Sie sehen gespeicherte Ergebnisse der
            kontrollierten Analysepipeline. Hier findet keine Live-Modellanalyse
            statt; persönliche Uploads sind nicht vorgesehen.
          </div>
          <section id="faelle" className="cases-section">
            <div className="section-top">
              <div>
                <p className="eyebrow">FALL AUSWÄHLEN</p>
                <h2>Drei Fälle. Drei unterschiedliche Grenzen.</h2>
              </div>
              <span className="small">Welchen möchten Sie nachvollziehen?</span>
            </div>
            <div
              className="case-grid"
              role="group"
              aria-label="Fiktiven Fall auswählen"
            >
              {demos.map((d, i) => (
                <button
                  key={d.id}
                  className={`case-card ${selected === d.id ? "selected" : ""}`}
                  aria-pressed={selected === d.id}
                  onClick={() => {
                    setLegal(null);
                    save(d.id, 1, []);
                  }}
                >
                  <span className="case-number">
                    0{i + 1}
                    <span aria-hidden="true">
                      {selected === d.id ? "✓" : "↗"}
                    </span>
                  </span>
                  <h3>{d.title}</h3>
                  <p>{descriptions[i]}</p>
                  <span className="case-tag">
                    {["FRISTVERGLEICH", "FEHLENDE ANGABEN", "WIDERSPRUCH"][i]}
                  </span>
                </button>
              ))}
            </div>
          </section>
          {storageError && (
            <p role="status" className="disclosure">
              Ihr Browser erlaubt das Speichern des Demo-Fortschritts nicht. Sie
              können die Demo trotzdem durchgehen.
            </p>
          )}
          {demo && (
            <section
              id="walkthrough"
              className="walkthrough"
              aria-label="Beispielfall nachvollziehen"
            >
              <div className="walkthrough-header">
                <p className="eyebrow">AUSGEWÄHLT / {demo.title}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    save(null, 1, []);
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                    } catch {}
                  }}
                >
                  Demo-Fortschritt löschen
                </button>
              </div>
              <ol className="steps" aria-label="Schritte">
                {["Dokument ansehen", "Angaben bestätigen", "Prüfung & Bericht"]
                  .map((label, i) => (
                    <li key={label} className={step === i + 1 ? "active" : ""}>
                      <button
                        disabled={i === 2 && !allConfirmed}
                        aria-current={step === i + 1 ? "step" : undefined}
                        onClick={() =>
                          go(i + 1)}
                      >
                        <span>{i + 1}</span>
                        {label}
                      </button>
                    </li>
                  ))}
              </ol>
              {step === 1 && (
                <div className="document-layout">
                  <div className="document-paper">
                    <span className="eyebrow">FIKTIVES DOKUMENT / SEITE 1</span>
                    <h2>Aktennotiz &amp; Kündigungsauszug</h2>
                    <pre>{demo.documents[0].extracted_text}</pre>
                  </div>
                  <aside className="reading-note">
                    <p className="eyebrow">DAS ORIGINAL BLEIBT SICHTBAR</p>
                    <h3>
                      Erst lesen.<br />Dann bestätigen.
                    </h3>
                    <p>
                      Der Dokumenttext ist die Grundlage der Angaben. Jede
                      Angabe verweist auf eine konkrete Seite und ein wörtliches
                      Zitat.
                    </p>
                    <p>
                      Die Beispielunterlagen verwenden eindeutige
                      Feldbezeichnungen. Andere PDFs werden manuell zugeordnet.
                      Scans und Bilder benötigen künftig OCR.
                    </p>
                    <a
                      href={`/portfolio/${demo.id}-document.pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Original-PDF öffnen ↗
                    </a>
                    <button className="button" onClick={() => go(2)}>
                      Angaben prüfen →
                    </button>
                  </aside>
                </div>
              )}
              {step === 2 && (
                <div className="fact-panel">
                  <h2>Welche Angaben stehen im Dokument?</h2>
                  <p>
                    Für dieses gespeicherte Beispiel wurden die folgenden
                    Angaben bestätigt. Gehen Sie sie anhand der Belegstellen
                    durch. Ihre Auswahl dient nur dem Demo-Ablauf und verändert
                    das gespeicherte Ergebnis nicht.
                  </p>
                  <p className="small">
                    Analysestichtag: {dates(demo.input.as_of)}{" "}
                    · Nutzerbestätigung ersetzt keine anwaltliche Prüfung.
                  </p>
                  <div className="facts">
                    {demo.input.facts.map((fact, i) => (
                      <label
                        className={`fact ${
                          confirmed.includes(i) ? "checked" : ""
                        }`}
                        key={`${fact.key}-${i}`}
                      >
                        <input
                          type="checkbox"
                          checked={confirmed.includes(i)}
                          onChange={() =>
                            save(
                              demo.id,
                              2,
                              confirmed.includes(i)
                                ? confirmed.filter((n) => n !== i)
                                : [...confirmed, i],
                            )}
                        />
                        <span>
                          <strong>{FACT_LABELS[fact.key]}</strong>
                          <span>{displayValue(fact.value)}</span>
                          <small>
                            Seite {fact.evidence.page} · „{fact.evidence.quote}“
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="panel-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        save(
                          demo.id,
                          2,
                          allConfirmed ? [] : demo.input.facts.map((_, i) => i),
                        )}
                    >
                      {allConfirmed
                        ? "Bestätigungen zurücknehmen"
                        : "Alle sichtbaren Angaben bestätigen"}
                    </button>
                    <button
                      className="button"
                      disabled={!allConfirmed}
                      onClick={() => go(3)}
                    >
                      Gespeicherte Prüfung ansehen →
                    </button>
                  </div>
                </div>
              )}
              {canShowResult && (
                <div className="result-panel">
                  <div className="section-top">
                    <div>
                      <p className="eyebrow">
                        GESPEICHERTES ERGEBNIS / VERSION {demo.result.version}
                      </p>
                      <h2>
                        {demo.result.calculations.length
                          ? "Termine mit Rechenweg."
                          : "Hier bleibt die Berechnung offen."}
                      </h2>
                    </div>
                    <span className="technical-tag">
                      Technische Prüfungen bestanden
                    </span>
                  </div>
                  <p>
                    Die Prüfung verwendet kontrollierte Regeln und Texte. Freie
                    Modellschlussfolgerungen sind nicht freigegeben. Dieser
                    Status ist keine anwaltliche Prüfung.
                  </p>
                  {!demo.result.calculations.length && (
                    <div className="open-point">
                      Aus den bestätigten Angaben lässt sich kein sicherer
                      Termin berechnen. Die fehlenden oder widersprüchlichen
                      Voraussetzungen stehen unten.
                    </div>
                  )}
                  <div className="calculation-grid">
                    {demo.result.calculations.map((c) => (
                      <article className="calculation" key={c.kind}>
                        <span className="eyebrow">
                          {c.kind === "notice_end"
                            ? "GESETZLICHER VERGLEICHSTERMIN"
                            : "KLAGEFRIST IM UNTERSTÜTZTEN GRUNDFALL"}
                        </span>
                        <strong className="due-date">{dates(c.due_on)}</strong>
                        <p>{c.method}</p>
                        <details>
                          <summary>Voraussetzungen und Quellen</summary>
                          <ul>
                            {c.assumptions.map((a) => <li key={a}>{a}</li>)}
                          </ul>
                          <p className="small">
                            {references(demo.result, c.source_ids)}
                          </p>
                        </details>
                      </article>
                    ))}
                  </div>
                  <h3>Was geprüft wurde</h3>
                  {demo.result.checks.map((c) => (
                    <p className="check" key={c.code}>
                      {c.statement}
                      <small>{references(demo.result, c.source_ids)}</small>
                    </p>
                  ))}
                  <h3>Offene Fragen für das anwaltliche Gespräch</h3>
                  <ul className="questions">
                    {demo.result.uncertainties.map((u) => <li key={u}>{u}</li>)}
                  </ul>
                  <details className="source-list">
                    <summary>
                      Verwendete Gesetzesquellen ({demo.result.sources.length})
                    </summary>
                    <p className="small">
                      Abrufdatum beschreibt den Abruf dieser Fassung, keine
                      Garantie des historischen Rechtsstands. Quellenversion:
                      {" "}
                      {demo.result.corpus_version}.
                    </p>
                    {demo.result.sources.map((s) => (
                      <details key={s.id}>
                        <summary>{s.reference}</summary>
                        <p>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            Amtliche Quelle öffnen ↗
                          </a>{" "}
                          · abgerufen {dates(s.retrieved_on)}
                        </p>
                        <pre>{s.text}</pre>
                        <p className="hash">SHA-256: {s.sha256}</p>
                      </details>
                    ))}
                  </details>
                  <div className="download-panel">
                    <div>
                      <h3>Die Fallakte zum Mitnehmen.</h3>
                      <p>
                        Bestätigte Tatsachen, Chronologie, Belegstellen,
                        Rechenwege, Quellen und offene Fragen in einem Bericht.
                      </p>
                    </div>
                    <a
                      className="button"
                      href={`/portfolio/${demo.id}-report.pdf`}
                      download
                    >
                      Bericht als PDF herunterladen ↓
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}
        </section>
        <section
          id="nachweise"
          className="story-section evidence-story"
          aria-labelledby="evidence-heading"
        >
          <div className="section-top">
            <div>
              <p className="eyebrow">06 / NACHWEISE & GRENZEN</p>
              <h2 id="evidence-heading">
                Was geprüft ist.<br />Und was offen bleibt.
              </h2>
            </div>
            <a href="https://github.com/dreamtelligence/Recht-Papier/blob/main/docs/portfolio/release-status.md">
              Vollständiger Projektstand ↗
            </a>
          </div>
          <div className="evidence-metrics">
            <div>
              <strong>24</strong>
              <span>fiktive Referenzfälle</span>
            </div>
            <div>
              <strong>40</strong>
              <span>deterministische Ausführungen</span>
            </div>
            <div>
              <strong>27</strong>
              <span>bestandene Edge-Tests</span>
            </div>
            <div>
              <strong>192</strong>
              <span>bestandene Python-Tests</span>
            </div>
          </div>
          <p className="evidence-context">
            Stand der dokumentierten Prüfungen: 10. November 2026. 16
            Entwicklungsfälle und acht getrennte Abnahmefälle, letztere je
            dreimal ausgeführt – ohne Referenzabweichung. Das prüft die
            unterstützten Regeln, keine allgemeine juristische Qualität.
          </p>
          <div className="evidence-links">
            <a href="https://github.com/dreamtelligence/Recht-Papier/blob/main/docs/portfolio/backend-e2e.json">
              <span>Echter Backend-Pfad</span>
              <strong>PDF → Analyse → bestätigter Bericht ↗</strong>
            </a>
            <a href="https://github.com/dreamtelligence/Recht-Papier/blob/main/docs/portfolio/corpus-before-after.json">
              <span>Quellenkorrektur</span>
              <strong>§ 622 BGB: 1.931 → 2.308 Zeichen ↗</strong>
            </a>
            <a href="https://github.com/dreamtelligence/Recht-Papier/blob/main/docs/portfolio/before-after.json">
              <span>Regressionsnachweis</span>
              <strong>Ungültige Modelldaten werden blockiert ↗</strong>
            </a>
            <a href="https://github.com/dreamtelligence/Recht-Papier/blob/main/docs/portfolio/evaluation.md">
              <span>Modellvergleich</span>
              <strong>Gemessene Fehler, Kosten und Grenzen ↗</strong>
            </a>
          </div>
          <details className="project-limits">
            <summary>Fachliche Grenzen und offene Abnahmen</summary>
            <ul>
              <li>
                Keine anwaltliche Validierung oder Freigabe für echte
                Rechtsberatung. Technische Prüfungen und Nutzerbestätigung
                ersetzen keine juristische Prüfung.
              </li>
              <li>
                Kontrollierte Fristen ausschließlich unter den bestätigten
                Voraussetzungen; gerichtlicher Feiertagskalender NRW 2026/2027.
                Tarifabweichungen, unklarer Zugang und Sonderfälle bleiben
                offen.
              </li>
              <li>
                Qwen / Gemini: kein vollständig abgeschlossener Vergleich.
                GPU-Kapazität und Quote begrenzten den Versuch; auswertbare
                Modelltexte enthielten Fehler. Freie Modellschlussfolgerungen
                bleiben gesperrt.
              </li>
              <li>
                Endgültiger Kostenabgleich offen. Die statische Demo benötigt
                keine bezahlten Modellaufrufe pro Besucher.
              </li>
              <li>
                Lokale Tests sind dokumentiert. Gehostete GitHub-CI ist wegen
                einer Abrechnungssperre nicht grün; kein Release-Tag v1.0.0.
              </li>
              <li>
                Physisches iPhone, Android und Store-Veröffentlichung nicht
                abgenommen. Sieben bekannte npm-Audit-Funde in nativer
                Routing-/Build-Abhängigkeit sind im Projektstatus dokumentiert.
              </li>
              <li>
                Impressum und Datenschutzerklärung enthalten sichtbare
                Portfolio-Platzhalter. Kein Nachweis der Produktionsreife.
              </li>
            </ul>
          </details>
        </section>
        {legal && (
          <section className="legal-panel" id="rechtliches">
            <button className="text-button" onClick={() => setLegal(null)}>
              Schließen
            </button>
            <h2>
              {legal === "impressum"
                ? "Impressum · Portfolio-Entwurf"
                : "Datenschutz · Portfolio-Entwurf"}
            </h2>
            {legal === "impressum"
              ? (
                <>
                  <p>
                    Die folgenden Angaben sind vom Projektinhaber ausdrücklich
                    als Platzhalter für dieses Portfolio vorgesehen und noch
                    nicht zur Veröffentlichung vervollständigt.
                  </p>
                  <p>
                    [Vollständiger Anbietername]<br />[Ladungsfähige
                    Anschrift]<br />[Kontakt-E-Mail]
                  </p>
                  <p>
                    Kein Rechtsberatungsangebot. Sämtliche Fallbeispiele sind
                    erfunden.
                  </p>
                </>
              )
              : (
                <>
                  <p>
                    Verantwortlicher: [Vollständiger Anbietername, Anschrift und
                    Kontakt folgen].
                  </p>
                  <p>
                    Die Demo verarbeitet keine persönlichen Falluploads, Konten
                    oder Analyseanfragen. Sie speichert ausschließlich die
                    Auswahl eines fiktiven Falls, den gewählten Schritt und
                    Demo-Bestätigungen im lokalen Browser-Speicher.
                    „Demo-Fortschritt löschen“ entfernt diese Daten.
                  </p>
                  <p>
                    Keine Analyse- oder Werbetracker. Das Hosting erfolgt über
                    Vercel. Beim Seitenabruf fallen technisch erforderliche
                    Verbindungsdaten wie IP-Adresse, Zeitpunkt und angeforderte
                    Datei an. Diese Portfolio-Erklärung ist noch unvollständig:
                    Die Angaben zu Verantwortlichem, Speicherdauer,
                    Rechtsgrundlage und Betroffenenrechten müssen
                    vervollständigt werden.
                  </p>
                  <p>
                    Externe Quellen und GitHub werden erst beim Anklicken
                    geöffnet. Die private native App hat einen separaten
                    Datenfluss und gehört nicht zur öffentlichen Demo.
                  </p>
                </>
              )}
          </section>
        )}
      </main>
      <footer>
        <div className="wordmark">
          Recht <i>&amp;</i> Papier
        </div>
        <p>Fiktive Fälle. Sichtbare Grenzen. Keine Rechtsberatung.</p>
        <div>
          <a href="#rechtliches" onClick={() => setLegal("impressum")}>
            Impressum
          </a>
          <a href="#rechtliches" onClick={() => setLegal("datenschutz")}>
            Datenschutz
          </a>
        </div>
      </footer>
    </div>
  );
}
