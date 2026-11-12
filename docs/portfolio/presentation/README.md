# Produkt-Fallstudie: Präsentation und Scrollkorrektur

Nutzerauftrag vom 10.11.2026: Recht & Papier als umfassenderes Produkt für Recruiter und technische Hiring Manager verständlich zeigen. Der geprüfte Kündigungsablauf ist ein Teil der Produktvision und bleibt vollständig als nachgelagerte Technische Demo erhalten.

## Befund vor der Änderung

1. Der Einstieg zeigte hauptsächlich Kündigungsbeispiele. Echte native Bildschirme, der gesamte vorhandene Funktionsumfang und UI/UX-Beiträge waren nicht im ersten Produktüberblick sichtbar. Belege: `before-1440.png`, `before-390.png`.
2. Eine echte Fingerbewegung auf der veröffentlichten Seite ergab **scrollY = 0**. Der bisherige Browser-Test benutzte automatische Locator-Scrolls und konnte die Sperre dadurch übersehen.
3. Ursache: Die von der installierten Expo-SDK-57-CLI erzeugte HTML-Vorlage setzt `body { overflow: hidden; }`, gedacht für eine App mit internem ScrollView. Die eigenständige Produktseite nutzt normales HTML. Allein `body { overflow: visible; }` ließ dieselbe Chromium-Fingerbewegung auf **635 Pixel** scrollen; WebKit bei Smartphonebreite scrollte mit normalem Wheel-Eingang ebenfalls.
4. Die ältere Intake-Aufnahme zeigte inzwischen nicht mehr unterstützte Dateiarten. Die neue native Aufnahme `08-fallaufnahme.png` zeigt den tatsächlichen PDF-Umfang. Es wurde dabei keine Akte angelegt und kein Backend-Zustand verändert.

## Neue Leserführung

Produktvision → tatsächlicher Funktionsstand → sechs originale iOS-Ansichten → UI/UX- und Frontend-Entscheidungen → Architektur und technische Beiträge → Technische Demo → Tests und bekannte Grenzen.

Die Gestaltung verwendet bestehende App-Assets: Papiertextur, Ballonillustration, Source Serif 4 inklusive OFL-Lizenz sowie die gedämpfte App-Farbpalette. Native Bilder sind unveränderte Original-PNGs, zum Vergrößern verlinkt. Die Screenshot-Auswahl ist per Maus, Touch und Tastatur bedienbar. Zusätzliche Aufnahmen zeigen fehlende Angaben, Widersprüche und Berichtsvorschau.

## Aussagen auf Implementierung zurückführen

| Öffentlich dargestellter Stand | Implementierung / Grenze |
| --- | --- |
| Konto, Sitzung und geschützte Navigation umgesetzt | `apps/mobile/src/features/auth/`, `apps/mobile/app/_layout.tsx`, Konto-Route und `delete-account` |
| Fallakten und private Dokumente umgesetzt | `apps/mobile/src/features/faelle/api.ts`, Storage-/RLS-Migrationen |
| PDF-Verarbeitung umgesetzt | `dokument-lesen` und seitenweise Belege; ausschließlich PDFs mit Textebene |
| Rechtliche Einordnung teilweise umgesetzt | Kontrollierter Kündigungsablauf; keine allgemeine fachliche Freigabe |
| Allgemeine Rechtssuche technisch angebunden | Nachschlagen-Route und Legal-Client; freie Modellaussagen nicht als validiert darstellen |
| Bericht und nativer Export umgesetzt | `dokument-erstellen`, Schreiben-Vorschau, `expo-print` / `expo-sharing` |
| OCR, breitere Fallarten, erweiterte Schreibenvorlagen und Erinnerungen geplant | Keine entsprechende fertige Funktion behaupten |
| UI/UX-Beiträge | Zentrale Design-Tokens, wiederverwendbare UI-Komponenten, Safe Areas, KeyboardAvoidingView, Zustandsführung und reduzierte Bewegung |

Umgesetzt heißt implementiert, nicht produktionsreif. Aussagen zur Modellqualität, Zugriffstrennung und Fristlogik behalten die bisherigen Nachweise und Grenzen. Keine neue Modellmessung, juristische Prüfung oder Geräteabnahme wird aus dem Präsentationsumbau abgeleitet.

## Reproduzieren

Die Browser-Tests benötigen Playwright (hier 1.65.0) und seine Chromium-/WebKit-Browser. Eine vorhandene Chromium-Installation kann mit `BROWSER_EXECUTABLE`, das Playwright-Modul mit `PLAYWRIGHT_MODULE` gewählt werden. Die Anwendung erhält dafür keine zusätzliche Laufzeitabhängigkeit.

```sh
npm --prefix apps/mobile run typecheck
npm run build:demo
python3 scripts/check-public-bundle.py
python3 -m http.server 3291 --bind 127.0.0.1 --directory apps/mobile/dist
# In einem zweiten Terminal, nach Installation von Playwright und Browsern:
node scripts/verify-browser.mjs
node scripts/verify-mobile-scroll.mjs
node scripts/verify-balloon-scroll.mjs
# Dasselbe gegen die veröffentlichte Seite:
DEMO_URL=https://recht-papier-portfolio.vercel.app node scripts/verify-browser.mjs
DEMO_URL=https://recht-papier-portfolio.vercel.app node scripts/verify-mobile-scroll.mjs
```

`verify-mobile-scroll.mjs` scheitert auf dem alten Stand mit „a normal scroll gesture left the page at 0px“. Der Test benutzt keine DOM-Scrollbefehle für seinen Nachweis. Er prüft Vorwärts- und Rückwärtsscrollen sowie Erreichbarkeit der Fußzeile bei 390 und 430 Pixeln. Chromium erhält echte CDP-Touch-Eingabe. Playwright unterstützt Wheel-Eingabe nicht im mobilen WebKit-Modus; deshalb wird WebKit ausdrücklich bei Smartphonebreite mit Wheel geprüft. Das ist keine Prüfung auf einem physischen iPhone.

`verify-browser.mjs` erhält alle drei Fälle, sechs Downloads, Bestätigungssperren, lokale Speicherung, beschädigte Fortschrittsdaten, Zurücksetzen und Rechtstexte. Hinzu kommen sechs Screenshot-Schritte pro Breite, Tastaturbedienung und die Reihenfolge der Produktabschnitte. `RENDER_REPORTS=1` erzeugt die Berichte optional erneut; Präsentationstests ändern vorhandene PDFs nicht.

## Visuelle Prüfung

Die Ballonfigur begleitet auf breiten Desktop-Ansichten den Lesefortschritt am rechten Rand: Eine blasse Grundansicht bleibt sichtbar, während die kräftige Fassung von unten nach oben aufgefüllt wird. Auf mobilen Geräten und schmalen Ansichten ist die zusätzliche Figur samt Scrollanzeige ausgeblendet. Reduzierte Bewegung deaktiviert das Pendeln; die Fortschrittsanzeige bleibt nutzbar. `verify-balloon-scroll.mjs` prüft Vorwärts-/Rückwärtsscrollen, Inhaltsänderungen, Fenstergrößen, die mobile Ausblendung und echte Chromium-Touch-Eingabe.

Am 12.11.2026 wurde die Startansicht im Einstieg und im ersten Schritt der App-Tour auf Nutzerwunsch durch die bereitgestellte Datei `docs/screenshots/startseite-2026-11-12.png` ersetzt (863 × 1822 Pixel). Die öffentliche Kopie heißt `00-startseite.png`; die bisherigen Simulatoraufnahmen bleiben als historische Nachweise erhalten. Die neue Startansicht wird nicht als erneut geprüfte Simulatoraufnahme bezeichnet.

`after-1440.png` und `after-390.png` zeigen den neuen Einstieg. `ios-flow-*.png` zeigen die native Tour. Die Browser-Bilder der einzelnen Demo-Fälle konzentrieren sich auf den jeweiligen Ablauf. Native Bilder wurden vor ihrer Einbindung angesehen; Asset-Hashes sichern die unveränderte Übernahme. Schriftgröße, Umbrüche, Abstände und Bildproportionen wurden anschließend in Desktop- und Smartphoneansichten geprüft.

Quellen zur Testmethode: [versionsgebundene Expo-Dokumentation](https://docs.expo.dev/versions/v57.0.0/), [Playwright-Emulation](https://playwright.dev/docs/emulation), [Touchscreen-API und deren Grenzen](https://playwright.dev/docs/api/class-touchscreen). Die Scrollursache wurde an der tatsächlich installierten CLI-Vorlage und am ausgelieferten HTML nachgemessen.
