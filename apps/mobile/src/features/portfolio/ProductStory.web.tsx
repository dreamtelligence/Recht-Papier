import { useEffect, useRef, useState } from "react";

const repo = "https://github.com/dreamtelligence/Recht-Papier";
const screens = [
  {
    file: "00-startseite.png",
    width: 863,
    height: 1822,
    title: "Ankommen",
    label: "Der Einstieg in die App",
    text:
      "Der Startbildschirm erklärt den Ablauf in drei Schritten. Über die Anmeldung geht es zu den eigenen Fallakten.",
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
    label: "Unterlagen und Bearbeitungsstand",
    text:
      "In der Fallakte liegen die Schilderung, hochgeladene Dokumente und der aktuelle Bearbeitungsstand. Der Server liest die PDF-Texte aus. Dokumente und Ergebnisse sind nur für das zugehörige Konto zugänglich.",
    detail: "Gespeicherte Fallakte · fiktiver Testfall",
  },
  {
    file: "02-bestaetigte-belegstellen.png",
    title: "Angaben bestätigen",
    label: "Angaben am Original prüfen",
    text:
      "Zu jeder Angabe sind die Seite und das Zitat aus dem Dokument sichtbar. Angaben für die Berechnung müssen bestätigt werden. Werden sie später geändert, ist das bisherige Ergebnis nicht mehr aktuell.",
    detail: "Typisierte Angaben · Seite und Zitat",
  },
  {
    file: "03-fristen-mit-rechenweg.png",
    title: "Einordnung verstehen",
    label: "Rechenwege und offene Fragen",
    text:
      "Der geprüfte Kündigungsablauf zeigt Rechenwege, Voraussetzungen, Rechtsquellen und offene Fragen. Fehlende oder widersprüchliche Angaben führen zu Rückfragen. Freie Modellschlussfolgerungen bleiben gesperrt.",
    detail: "Kontrollierter Teilablauf · keine juristische Validierung",
  },
  {
    file: "07-nativer-pdf-export.png",
    title: "Bericht mitnehmen",
    label: "Vorschau und PDF-Export",
    text:
      "Der Bericht fasst bestätigte Angaben, den zeitlichen Ablauf und offene Prüfpunkte zusammen. Nach der Vorschau und Bestätigung lässt er sich als PDF über den Teilen-Dialog von iOS weitergeben.",
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
            Mit Recht &amp; Papier lassen sich rechtliche Anliegen und die
            zugehörigen Unterlagen in einer mobilen Fallakte sammeln.
            Daraus entsteht ein Bericht zur Vorbereitung auf ein
            anwaltliches Gespräch.
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
            />In Entwicklung · technisch geprüfte Beispielfälle · keine Rechtsberatung
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
            Was ist passiert?<br />Was steht in den Unterlagen?
          </h2>
          <p>
            Ein rechtliches Schreiben wirft oft Fragen auf. Die App soll helfen,
            die Unterlagen zu sortieren, wichtige Angaben zu prüfen und offene
            Fragen für ein Beratungsgespräch festzuhalten. Ein erster Ablauf
            ist für Kündigungen durch den Arbeitgeber umgesetzt.
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
          <h3>Der aktuelle Stand</h3>
          <p>
            Die folgenden Funktionen sind entwickelt. Die fachliche Prüfung
            und die Freigabe für den regulären Betrieb stehen noch aus.
          </p>
        </div>
        <div className="project-status">
          <article className="status-column implemented">
            <p className="status-label">Umgesetzt</p>
            <h3>Konto, Fallakte und Bericht</h3>
            <ul>
              <li>Konto, Sitzungen und geschützte Navigation.</li>
              <li>Gespeicherte Fallakten und private PDF-Ablage.</li>
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
            <h3>Nächste Entwicklungsschritte</h3>
            <ul>
              <li>Weitere Fallarten und juristische Prüfung.</li>
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
            Die folgenden Screenshots zeigen den Ablauf in der iOS-App.
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
          Die Startansicht stammt vom 12. November 2026. Die übrigen Aufnahmen
          zeigen fiktive Testfälle im iPhone-Simulator vom 10. November 2026.
          Auf dieser Website lassen sich die Screenshots ansehen; eigene Fälle
          können hier nicht analysiert werden.
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
            Wie die App gestaltet ist.
          </h2>
          <p>
            Die Oberfläche greift das Aussehen von Papier auf: ein heller
            Hintergrund mit feiner Textur, Serifenschrift und dünne Linien.
            Der Ballon taucht als wiederkehrendes Motiv auf. Pro Bildschirm
            steht der nächste Bearbeitungsschritt im Vordergrund.
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
              <h3>Ein Schritt nach dem anderen</h3>
              <p>
                Die Schilderung und das Dokument werden im selben Formular
                erfasst. Fehlen Angaben oder tritt ein Fehler auf, erklärt die
                App, was noch nötig ist.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Bedienung auf dem Smartphone</h3>
              <p>
                Die Formulare berücksichtigen die Bildschirmtastatur und die
                freien Ränder des Displays. Gemeinsame Komponenten für Text,
                Flächen und Schaltflächen sorgen für eine einheitliche Bedienung.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Den Bearbeitungsstand erkennen</h3>
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
              <h3>Tastaturbedienung und Beschriftungen</h3>
              <p>
                Bedienelemente und Statusmeldungen sind beschriftet. Die
                Website lässt sich per Tastatur bedienen und zeigt den Fokus
                an. Die Einstellung für reduzierte Bewegung wird berücksichtigt.
                Eine vollständige Prüfung der Barrierefreiheit steht noch aus.
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
              Die Technik hinter der App.
            </h2>
          </div>
          <a className="source-link" href={repo}>
            Öffentlichen Quellcode ansehen ↗
          </a>
        </div>
        <div className="contribution-grid">
          <article>
            <span>Frontend & Mobile</span>
            <h3>Oberfläche und Navigation</h3>
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
            <h3>Private Fallakten speichern</h3>
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
            <h3>Fristen anhand fester Regeln berechnen</h3>
            <p>
              Eine Python-Engine liefert versionierte Rechtsquellen; ein
              gemeinsames JSON Schema legt das Ergebnisformat fest. Die
              Fristberechnung folgt festen Regeln und bestätigten Angaben.
              Freie Schlussfolgerungen eines Sprachmodells sind dafür gesperrt.
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
            <strong>Website und native App.</strong>{" "}
            Diese Website enthält ausschließlich fiktive Beispieldaten.
            Die native App greift nach der Anmeldung auf die privaten
            Fallakten im Backend zu.
          </p>
          <p>
            <strong>Verarbeitung und Prüfung.</strong>{" "}
            Der Worker erhält öffentliche Versionskennungen. Private Belege
            und Berechnungen werden serverseitig in Supabase geprüft. Die
            allgemeine Rechtssuche läuft getrennt davon und ist fachlich noch
            nicht freigegeben.
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
