import { useEffect, useRef, useState } from "react";

const repo = "https://github.com/dreamtelligence/Recht-Papier";
const screens = [
  {
    file: "00-startseite.png",
    width: 863,
    height: 1822,
    title: "Ankommen",
    label: "Ein ruhiger Einstieg",
    text:
      "Ein klares Versprechen, drei verständliche Schritte und eine Hauptaktion. Der Startbildschirm führt zur Anmeldung; die Fallakten liegen hinter der geschützten Navigation.",
    detail: "Startansicht · vom Nutzer bereitgestellt",
  },
  {
    file: "08-fallaufnahme.png",
    title: "Fall aufnehmen",
    label: "Das Anliegen in eigenen Worten",
    text:
      "Sachverhalt und Dokument gehören in denselben Schritt. Die Eingabemaske erklärt die unterstützten Dateitypen und gibt den nächsten Schritt erst frei, wenn die benötigten Angaben vorliegen.",
    detail: "Aktuelle Eingabemaske · PDF mit Textebene",
  },
  {
    file: "01-fallakte.png",
    title: "Dokumente ordnen",
    label: "Eine Akte als gemeinsame Grundlage",
    text:
      "Die Fallakte hält Sachverhalt, private Dokumente und den Bearbeitungsstand zusammen. Hochgeladene PDFs werden serverseitig ausgelesen; die Ergebnisse bleiben dem jeweiligen Konto zugeordnet.",
    detail: "Gespeicherte Fallakte · fiktiver Testfall",
  },
  {
    file: "02-bestaetigte-belegstellen.png",
    title: "Angaben bestätigen",
    label: "Jede wichtige Angabe hat einen Beleg",
    text:
      "Seite und wörtliches Zitat bleiben sichtbar. Berechnungsrelevante Angaben werden ausdrücklich bestätigt. Ändert sich die Grundlage, darf ein früheres Ergebnis nicht als aktuell weiterverwendet werden.",
    detail: "Typisierte Angaben · Seite und Zitat",
  },
  {
    file: "03-fristen-mit-rechenweg.png",
    title: "Einordnung verstehen",
    label: "Ein Ergebnis mit sichtbaren Grenzen",
    text:
      "Der geprüfte Kündigungsablauf zeigt Rechenwege, Voraussetzungen, Rechtsquellen und offene Fragen. Fehlende oder widersprüchliche Angaben führen zu Rückfragen. Freie Modellschlussfolgerungen bleiben gesperrt.",
    detail: "Kontrollierter Teilablauf · keine juristische Validierung",
  },
  {
    file: "07-nativer-pdf-export.png",
    title: "Bericht mitnehmen",
    label: "Vom Ergebnis zum Dokument",
    text:
      "Ein strukturierter Bericht bündelt bestätigte Tatsachen, Chronologie und Prüfpunkte. Nach der Vorschau und Nutzerbestätigung wird er als PDF erzeugt und über den nativen iOS-Dialog weitergegeben.",
    detail: "Tatsächlicher PDF-Export · kein Versand an Dritte",
  },
];
const extraScreens = [
  {
    file: "04-fehlender-zugang.png",
    title: "Fehlende Angaben",
    text: "Die Anwendung fragt gezielt nach dem Zugangstag.",
  },
  {
    file: "05-widerspruch.png",
    title: "Widersprüchliche Belege",
    text: "Unvereinbare Angaben bleiben ein offener Prüfpunkt.",
  },
  {
    file: "06-bestaetigter-bericht.png",
    title: "Berichtsvorschau",
    text: "Die gespeicherte Fassung bleibt vor dem Export lesbar.",
  },
];

export default function ProductStory() {
  const [screenIndex, setScreenIndex] = useState(0);
  const balloonRef = useRef<HTMLDivElement>(null);
  const screen = screens[screenIndex];

  useEffect(() => {
    const balloon = balloonRef.current;
    if (!balloon) return;

    const updateProgress = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress = range > 0
        ? Math.min(1, Math.max(0, window.scrollY / range))
        : 1;
      balloon.style.setProperty("--balloon-hidden", `${(1 - progress) * 100}%`);
    };
    const observer = new ResizeObserver(updateProgress);
    observer.observe(document.body);
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <>
      <section className="product-hero" aria-labelledby="headline">
        <div className="hero-copy">
          <p className="eyebrow">UI·UX / FRONTEND / FULL STACK</p>
          <h1 id="headline">
            Recht verstehen.<br />
            <em>Besser reagieren.</em>
          </h1>
          <p className="hero-description">
            Recht &amp; Papier ist als digitale Rechtsassistenz konzipiert. Die
            mobile App verbindet Sachverhalt, Dokumente und rechtliche
            Orientierung in einer Fallakte – mit einem Bericht für das
            anwaltliche Gespräch.
          </p>
          <div className="hero-actions">
            <a className="button" href="#ios-app">
              App ansehen <span aria-hidden="true">↗</span>
            </a>
            <a href="#technische-demo">Technische Demo →</a>
          </div>
          <p className="project-note">
            <span
              className="status-dot"
              aria-hidden="true"
            />Entwicklungsprojekt · geprüfter Teilablauf · keine Rechtsberatung
          </p>
        </div>
        <div className="hero-visual">
          <div className="balloon-mark" ref={balloonRef} aria-hidden="true">
            <img
              className="balloon-outline"
              src="/portfolio/balloon.png"
              alt=""
              loading="lazy"
              width="260"
              height="360"
            />
            <img
              className="balloon-progress"
              src="/portfolio/balloon.png"
              alt=""
              loading="lazy"
              width="260"
              height="360"
            />
          </div>
          <figure className="hero-capture">
            <a
              href="/portfolio/native/00-startseite.png"
              target="_blank"
              rel="noreferrer"
              aria-label="iOS-Startbildschirm in voller Größe öffnen"
            >
              <img
                src="/portfolio/native/00-startseite.png"
                alt="Startansicht mit Papiertextur, Ballonillustration und Fall-beginnen-Aktion"
                width="863"
                height="1822"
                fetchPriority="high"
              />
            </a>
            <figcaption>RECHT &amp; PAPIER / STARTANSICHT</figcaption>
          </figure>
          <span className="capture-label">01 — Der erste Eindruck.</span>
        </div>
      </section>
      <dl className="project-facts">
        <div>
          <dt>Entwicklungsfelder</dt>
          <dd>Produktkonzept · UI/UX · Mobile · Backend</dd>
        </div>
        <div>
          <dt>Technologien</dt>
          <dd>Expo · React Native · TypeScript · Supabase · Python</dd>
        </div>
        <div>
          <dt>Stand</dt>
          <dd>Native App mit geprüftem Kündigungsablauf</dd>
        </div>
      </dl>

      <section
        id="produkt"
        className="story-section product-overview"
        aria-labelledby="product-heading"
      >
        <div className="section-intro">
          <p className="eyebrow">01 / DAS PRODUKT</p>
          <h2 id="product-heading">
            Ein rechtliches Anliegen.<br />Eine gemeinsame Fallakte.
          </h2>
          <p>
            Gedacht für Menschen, die rechtliche Schreiben und ihre eigene
            Situation besser verstehen möchten. Die Vision verbindet Dokumente,
            rechtliche Orientierung und nächste Schritte in einer mobilen
            Anwendung.
          </p>
        </div>
        <div className="product-register">
          <div>
            <span>Schildern</span>
            <p>Sachverhalt und Unterlagen an einem Ort erfassen.</p>
          </div>
          <div>
            <span>Einordnen</span>
            <p>Angaben, Rechtsquellen und offene Fragen nachvollziehen.</p>
          </div>
          <div>
            <span>Reagieren</span>
            <p>
              Einen strukturierten Bericht für das weitere Gespräch mitnehmen.
            </p>
          </div>
        </div>
        <div className="status-heading">
          <h3>Was heute tatsächlich vorhanden ist</h3>
          <p>
            Implementiert bedeutet hier: im Projekt vorhanden. Es bedeutet keine
            fachliche oder betriebliche Produktionsfreigabe.
          </p>
        </div>
        <div className="project-status">
          <article className="status-column implemented">
            <p className="status-label">Umgesetzt</p>
            <h3>Die mobile Grundlage</h3>
            <ul>
              <li>Konto, Sitzungen und geschützte Navigation.</li>
              <li>Persistente Fallakten und private PDF-Ablage.</li>
              <li>Textauslese mit seitenweisen Belegstellen.</li>
              <li>Hintergrundaufträge, Quellenansicht und Statusanzeige.</li>
              <li>Berichtsvorschau, Nutzerbestätigung und PDF-Export.</li>
            </ul>
          </article>
          <article className="status-column partial">
            <p className="status-label">Teilweise umgesetzt</p>
            <h3>Die rechtliche Einordnung</h3>
            <ul>
              <li>
                Kontrolliert geprüft: ordentliche Arbeitgeberkündigung aus
                Arbeitnehmersicht.
              </li>
              <li>
                Allgemeine Rechtssuche: Oberfläche und API angebunden; freie
                Modellaussagen ohne fachliche Freigabe.
              </li>
              <li>
                Mobile Prüfung: nativer iOS-Simulator; physisches Gerät und
                Android noch offen.
              </li>
            </ul>
          </article>
          <article className="status-column planned">
            <p className="status-label">Geplant</p>
            <h3>Die umfassendere Assistenz</h3>
            <ul>
              <li>Weitere Fallarten und fachlicher Review.</li>
              <li>OCR für Scans und weitere Dokumenttypen.</li>
              <li>Erweiterte Schreibenvorlagen und Fristerinnerungen.</li>
              <li>
                Produktiver Betrieb und Store-Veröffentlichung nach den offenen
                Abnahmen.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section
        id="ios-app"
        className="story-section native-story"
        aria-labelledby="native-heading"
      >
        <div className="section-top">
          <div>
            <p className="eyebrow">02 / DIE ANWENDUNG</p>
            <h2 id="native-heading">
              Vom ersten Bildschirm<br />bis zum Bericht.
            </h2>
          </div>
          <p className="section-caption">
            Originalaufnahmen der bestehenden iOS-App. Kein generiertes UI,
            keine nachgebaute Bildschirmgrafik.
          </p>
        </div>
        <div className="native-walkthrough">
          <div
            className="native-steps"
            role="group"
            aria-label="Bildschirm im iOS-Ablauf auswählen"
          >
            {screens.map((item, index) => (
              <button
                key={item.file}
                type="button"
                aria-pressed={index === screenIndex}
                aria-controls="native-preview"
                onClick={() => setScreenIndex(index)}
              >
                <span className="step-index">0{index + 1}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.label}</small>
                </span>
                <span aria-hidden="true">
                  {index === screenIndex ? "↗" : "+"}
                </span>
              </button>
            ))}
            <div
              className="native-description"
              id="native-description"
              aria-live="polite"
            >
              <h3>{screen.label}</h3>
              <p>{screen.text}</p>
            </div>
          </div>
          <figure
            className="native-preview"
            id="native-preview"
            aria-describedby="native-description"
          >
            <a
              href={`/portfolio/native/${screen.file}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${screen.title}: Originalaufnahme öffnen`}
            >
              <img
                key={screen.file}
                src={`/portfolio/native/${screen.file}`}
                alt={`${screen.title}: Bildschirmansicht der iOS-App`}
                width={screen.width ?? 1206}
                height={screen.height ?? 2622}
                loading="lazy"
              />
            </a>
            <figcaption>
              <span>{screen.detail}</span>
              <a
                href={`/portfolio/native/${screen.file}`}
                target="_blank"
                rel="noreferrer"
              >
                Original vergrößern ↗
              </a>
            </figcaption>
          </figure>
        </div>
        <p className="capture-note">
          Startansicht vom Nutzer bereitgestellt am 12. November 2026. Weitere
          Aufnahmen aus mehreren fiktiven Testfällen im iPhone-Simulator, 10.
          November 2026. Sie dokumentieren die vorhandenen Oberflächen; der
          Browser startet keine private Fallanalyse.
        </p>
        <details className="more-captures">
          <summary>
            Weitere App-Aufnahmen: Rückfragen, Widersprüche und Bericht
          </summary>
          <div className="extra-captures">
            {extraScreens.map((item) => (
              <figure key={item.file}>
                <a
                  href={`/portfolio/native/${item.file}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={`/portfolio/native/${item.file}`}
                    alt={item.title}
                    width="1206"
                    height="2622"
                    loading="lazy"
                  />
                </a>
                <figcaption>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </details>
      </section>

      <section
        id="gestaltung"
        className="story-section design-story"
        aria-labelledby="design-heading"
      >
        <div className="section-intro">
          <p className="eyebrow">03 / UI·UX & FRONTEND</p>
          <h2 id="design-heading">
            So ruhig wie Papier.<br />So klar wie eine gute Oberfläche.
          </h2>
          <p>
            Die Gestaltung übersetzt ein komplexes Thema in einen geführten
            Ablauf. Papiertextur, Serifentypografie, Haarlinien und die
            bestehende Ballonillustration bilden eine gemeinsame visuelle
            Sprache.
          </p>
          <div
            className="design-palette"
            aria-label="Bestehende App-Farbpalette"
          >
            <span>
              <i className="paper-swatch" />Papier
            </span>
            <span>
              <i className="ink-swatch" />Tinte
            </span>
            <span>
              <i className="accent-swatch" />Blaugrau
            </span>
          </div>
          <p className="type-specimen">
            Aa{" "}
            <span>
              Source Serif 4<br />lokal eingebunden
            </span>
          </p>
        </div>
        <div className="design-decisions">
          <article>
            <span>01</span>
            <div>
              <h3>Ein nächster Schritt</h3>
              <p>
                Eine Hauptaktion pro Phase, Sachverhalt und Dokument im selben
                Formular, verständliche Fehler- und Leerzustände. Die Fallakte
                hält den Ablauf zusammen.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Native Details, bewusst umgesetzt</h3>
              <p>
                Geschützte Routen, Rücknavigation, Safe Areas und
                tastaturgerechte Formulare. Wiederverwendbare Papier-, Text- und
                Aktionsbausteine halten die Oberfläche konsistent.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Verständlichkeit bis zum Fehlerfall</h3>
              <p>
                Belegstellen bleiben sichtbar. Lade-, Prüf- und Freigabestatus
                werden getrennt dargestellt. Bestätigung und PDF-Export sind
                eigenständige Schritte.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Zugänglichkeit als Implementierungsdetail</h3>
              <p>
                Beschriftete Bedienelemente und Statusmeldungen in der App;
                reduzierte Bewegung wird berücksichtigt. Die Web-Fallstudie
                ergänzt Tastaturbedienung und sichtbare Fokuszustände. Eine
                vollständige Accessibility-Abnahme wird nicht behauptet.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section
        id="architektur"
        className="story-section engineering-story"
        aria-labelledby="engineering-heading"
      >
        <div className="section-top">
          <div>
            <p className="eyebrow">04 / ENTWICKLUNGSARBEIT</p>
            <h2 id="engineering-heading">
              Eine Oberfläche.<br />Ein durchgängiger technischer Weg.
            </h2>
          </div>
          <a className="source-link" href={repo}>
            Öffentlichen Quellcode ansehen ↗
          </a>
        </div>
        <div className="contribution-grid">
          <article>
            <span>Frontend & Mobile</span>
            <h3>Vom Design zum nutzbaren Ablauf</h3>
            <p>
              Expo Router, React Native und TypeScript: wiederverwendbare
              UI-Bausteine, Formzustände, persistente Sitzungen und das
              Nachladen laufender Analysen.
            </p>
            <a href={`${repo}/tree/main/apps/mobile/src`}>
              UI und Client-Code ↗
            </a>
          </article>
          <article>
            <span>Backend & Datenmodell</span>
            <h3>Die Fallakte als gemeinsame Grundlage</h3>
            <p>
              Supabase Auth, private Storage-Dateien und Eigentümer-RLS.
              Revisionen und atomare Schreibvorgänge verhindern Ergebnisse aus
              einem veralteten Eingabestand.
            </p>
            <a href={`${repo}/tree/main/supabase`}>
              Datenmodell und Edge Functions ↗
            </a>
          </article>
          <article>
            <span>KI-Integration & Qualität</span>
            <h3>Berechnen, belegen, begrenzen</h3>
            <p>
              Python-Engine, versionierter Quellenbestand und ein gemeinsames
              JSON Schema. Fristen werden aus bestätigten Angaben berechnet. Ein
              Zitat gibt eine falsche Modellschlussfolgerung nicht frei.
            </p>
            <a href={`${repo}/tree/main/packages/shared`}>
              Vertrag und Berechnungsregeln ↗
            </a>
          </article>
        </div>
        <div className="architecture-path">
          <div>
            <span>01 / CLIENT</span>
            <strong>Native App</strong>
            <p>Aufnahme · Dokumente · Bestätigung</p>
          </div>
          <span className="path-arrow" aria-hidden="true">→</span>
          <div>
            <span>02 / PRIVATE FALLAKTE</span>
            <strong>Supabase</strong>
            <p>Auth · Storage · Revision · Auftrag</p>
          </div>
          <span className="path-arrow" aria-hidden="true">→</span>
          <div>
            <span>03 / QUELLEN & PRÜFUNG</span>
            <strong>Python / Modal + Edge</strong>
            <p>Normbestand · Belege · Code-Regeln</p>
          </div>
          <span className="path-arrow" aria-hidden="true">→</span>
          <div>
            <span>04 / ERGEBNIS</span>
            <strong>Bericht & PDF</strong>
            <p>Tatsachen · Rechenweg · offene Fragen</p>
          </div>
        </div>
        <div className="architecture-notes">
          <p>
            <strong>Öffentlich und privat getrennt.</strong>{" "}
            Diese Fallstudie ist ein statischer Web-Einstieg. Nur fiktive
            Beispieldaten gelangen ins öffentliche Bundle. Die native App
            verwendet den authentifizierten Backend-Pfad.
          </p>
          <p>
            <strong>Bewusste Begrenzung.</strong>{" "}
            Der kontrollierte Worker erhält öffentliche Versionskennungen.
            Private Belege und Berechnungen werden an der Supabase-Grenze
            geprüft. Der breitere RAG-Dienst bleibt ein separater, fachlich
            nicht freigegebener Pfad.
          </p>
        </div>
        <a
          className="architecture-document"
          href="/portfolio/architecture.html"
        >
          Architektur, Sicherheitsgrenzen und Regressionsnachweise im Detail →
        </a>
      </section>
    </>
  );
}
