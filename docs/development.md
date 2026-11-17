# Lokal ausführen und Prüfungen reproduzieren

Die [öffentliche Produkt-Fallstudie](../README.md) und der private native Pfad
sind getrennte Anwendungen. Die folgenden Befehle und Voraussetzungen stammen
aus der bisherigen vollständigen README-Anleitung.

## Öffentliche Checks und Web-Vorschau

Node.js 24, Python 3 und Deno 2.9 werden für die öffentlichen Checks benötigt:

```sh
npm --prefix apps/mobile ci
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run test:analysis-status
npm --prefix apps/mobile run test:casefile-boundaries
node scripts/test-document-extraction.cjs
python3 scripts/generate-contract.py --check
npm run test:portfolio
npm run test:database
npm run eval:portfolio
deno run --allow-read --allow-write --allow-run --config supabase/functions/deno.json scripts/compare-regression.ts
npm run build:demo
python3 scripts/check-public-bundle.py
python3 -m http.server 3291 --bind 127.0.0.1 --directory apps/mobile/dist
```

Der statische Build benötigt keine `.env` und keine Cloud-Zugangsdaten. Die gespeicherten PDFs und Ergebnisse sind eingecheckt. Die Browserprüfung in `scripts/verify-browser.mjs` benötigt Playwright und Chromium; `PLAYWRIGHT_MODULE` und `BROWSER_EXECUTABLE` erlauben vorhandene lokale Installationen. `DEMO_URL` prüft ein anderes Deployment. `RENDER_REPORTS=1` erzeugt bei lokaler Ausführung die Bericht-PDFs erneut. `scripts/verify-mobile-scroll.mjs` prüft echte Touch-Eingabe in Chromium sowie Scrollen in WebKit bei Smartphonebreite; dafür müssen die entsprechenden Playwright-Browser installiert sein. [Präsentation und Scrollregression](portfolio/presentation/README.md).

Für den privaten nativen Pfad ein eigenes Supabase-Testprojekt mit Migrationen, privaten Buckets, Edge Functions und dem separaten Modal-Worker konfigurieren. Zugangsdaten bleiben in ignorierten `.env`-Dateien beziehungsweise Server-Secrets. Dann `npm --prefix apps/mobile run ios`. Die Integrationstests in `supabase/tests/` und `scripts/verify-portfolio-e2e.py` erstellen temporäre Testkonten und benötigen entsprechend autorisierten Backend-Zugang; sie sind keine anonymen CI-Tests.

Der iOS-Simulator-Entwicklungsbuild benötigt einen laufenden Metro-Server. Standard ist Port 8081; separat starten mit `npm --prefix apps/mobile run start -- --localhost`. Bei „No script URL provided“ zuerst Server und gespeicherte Bundler-Adresse prüfen. Eine Adresse, die nur als Startargument übergeben wird, bleibt beim späteren Öffnen über das App-Icon nicht erhalten. `expo run:ios --no-bundler` startet selbst keinen Server. Ein eigenständig startender Release-Build ist davon getrennt.
