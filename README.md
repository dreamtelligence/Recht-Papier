# Recht & Papier

**[Produkt-Fallstudie](https://recht-papier-portfolio.vercel.app)** · **[Beispielbericht als PDF](apps/mobile/public/portfolio/dev-01-report.pdf)** · **[iPhone-Ablauf in Screenshots](docs/portfolio/native/README.md)**

Recht & Papier sammelt Schilderung, Dokumente und bestätigte Angaben in einer mobilen Fallakte. Daraus entsteht ein Bericht zur Vorbereitung auf ein anwaltliches Gespräch. Das Projekt umfasst Produktkonzept, UI/UX, App und Backend.

Umgesetzt und technisch geprüft ist die **ordentliche Arbeitgeberkündigung aus Arbeitnehmersicht**. Die interaktive Demo zeigt drei fiktive Fälle mit vorab vom Backend erzeugten Ergebnissen; Besucher starten keine KI-Analyse.

**Portfolio-Projekt, keine Rechtsberatung. Die anwaltliche Prüfung steht noch aus.**

<a href="https://recht-papier-portfolio.vercel.app"><img src="docs/portfolio/presentation/after-1440.png" alt="Recht & Papier: Projektvorstellung mit Screenshot der iOS-App"></a>

## Technische Umsetzung

Expo / React Native und TypeScript, Supabase sowie eine Python-Engine auf Modal. [Architektur und Datenfluss](docs/architecture.md).

- **Belegte Angaben:** Werte verweisen auf Seite und Originalzitat, werden bestätigt und serverseitig auf Widersprüche geprüft.
- **Kontrollierte Fristen:** Feste Regeln berechnen Termine; Voraussetzungen und offene Fragen bleiben sichtbar.
- **Gemeinsamer Vertrag:** Ein versioniertes JSON Schema verbindet App, Berechnung und Bericht. Der Server validiert das Ergebnis.
- **Versionierte Quellen:** Der Kündigungsablauf verwendet 16 amtliche Normtexte mit festen Versionen und Text-Hashes.
- **Geschütztes Backend:** Private Fallakten mit Auth und Eigentümer-RLS; Hintergrundaufträge arbeiten mit eingefrorenen Eingaben und authentifizierten Rückmeldungen.

Einstieg in den Code: [Vertrag](packages/shared/contract.schema.json), [Berechnung](packages/shared/termination.ts), [Bericht](packages/shared/report.ts). Die Python-Engine liegt im separaten [Jura-Repository](https://github.com/dreamtelligence/Jura).

## Fehler und ihre Korrekturen

| Ursprünglicher Fehler | Nachweis und Korrektur |
| --- | --- |
| XML-Parser verliert Text nach Unterelementen | § 622 BGB: **1.931 → 2.308 Zeichen**; Vertragsausnahme und Teilzeitzählung wieder enthalten. [Messung](docs/portfolio/corpus-before-after.json) |
| Bestehende Dokument-ID überspringt geänderten Text | Regression prüft neues Embedding, unveränderte Punkt-ID, Persistenz und Wiederladen; unterbrochene Versionen werden gesperrt. Implementierung und Tests im Jura-Repository. |
| Ungültiges Datum aus Modelltext | Isolierter Test des alten Extraktors: `2026-11-31`. Die Kalenderprüfung weist es zurück; der kontrollierte Rechner liefert im Referenzfall `2026-11-30`. [Reproduktion](docs/portfolio/before-after.json) |
| Passende Quellen-ID verdeckt falsche Schlussfolgerung | **15 von 17 auswertbaren Gemini-Antworten** enthielten abweichende Termine. Freie Modellantworten bleiben gesperrt; der Kündigungsablauf verwendet feste Regeln. [Auswertung](docs/portfolio/evaluation.md) |

## Tests und Nachweise

**24 fiktive Referenzfälle, 40 bestandene Testläufe:** 16 Entwicklungsfälle und acht Abnahmefälle, letztere jeweils dreimal ausgeführt. Ein separater, isolierter Ende-zu-Ende-Lauf bestand **22 Prüfschritte** vom Login bis zum Export; das bestehende Produktivbackend wurde dabei nicht aktualisiert. Die native Sichtprüfung erfolgte im iPhone-Simulator. Der Modellvergleich bleibt unvollständig; Versuchsaufbau und Grenzen stehen in der [Evaluation](docs/portfolio/evaluation.md).

[Backend-Nachweis](docs/portfolio/backend-e2e.json) · [Isolierter Rollout](docs/research/2026-11-16-isolated-rollout.md) · [Browserprüfung](docs/portfolio/browser-verification.json) · [Release-Status](docs/portfolio/release-status.md)

## Lokal reproduzieren

Mit Node.js 24 und Python 3, ohne Cloud-Zugangsdaten:

```sh
npm --prefix apps/mobile ci
npm run build:demo
python3 -m http.server 3291 --bind 127.0.0.1 --directory apps/mobile/dist
```

Vollständige Prüfkommandos, native Einrichtung, Metro und Browserchecks: [Entwicklungsanleitung](docs/development.md).

## Umfang und Grenzen

Unterstützt werden PDFs mit Textebene und bestätigte gesetzliche Grundfälle; der gerichtliche Feiertagskalender gilt für **NRW 2026/2027**. Unbekannter Zugang, widersprüchliche Angaben, Tarifabweichungen und Sonderfälle bleiben offen. OCR, weitere Rechtsgebiete, Kanzleiportal und Abrechnung sind nicht Teil dieses Releases; Kündigungsgrund, Sozialauswahl und Gesamtwirksamkeit werden nicht abschließend beurteilt.

Vor einem Pilotbetrieb fehlen fachliche Abnahme, vollständige Anbieter- und Datenschutzangaben sowie weitere Betriebs- und Store-Nachweise. Die vorhandenen Angaben sind erkennbare Portfolio-Platzhalter; die App wurde nicht für den App Store eingereicht. [Offene Voraussetzungen](docs/portfolio/release-status.md).

## Weitere Dokumentation

- [Dokumentationsindex](docs/README.md) und [Audit mit Korrekturen](docs/research/2026-11-16-remediation.md)
- [Rechtssuche, Modellversuch und Wiederherstellung](docs/technical-notes.md)
- [Lokale Entwicklung und vollständige Prüfkommandos](docs/development.md)
