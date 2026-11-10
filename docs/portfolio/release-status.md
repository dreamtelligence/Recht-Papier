# Portfolio: überprüfter Stand

Stand 10.11.2026. Auftrag: `docs/portfolio-release-plan.md`. Nutzerentscheidungen: vorhandenes Qwen/Gemini, erkennbare Anbieter-Platzhalter, native Dokumentation mit Screenshots.

**Öffentliche Demo:** https://recht-papier-portfolio.vercel.app

- [x] Gemeinsames versioniertes Schema und generierte TypeScript-Typen.
- [x] Bestätigte typisierte Angaben mit Dokumentseite und wörtlicher Belegstelle; Freitext bleibt getrennt.
- [x] Eng begrenzte Fristregeln und explizite offene Prüfpunkte.
- [x] 24 Referenzfälle, 40 deterministische Ausführungen, keine Referenzabweichung.
- [x] 16 vollständige versionierte Normtexte; echter XML-Vergleich 1.931 → 2.308 Zeichen für § 622 BGB.
- [x] Index-Regression für geänderte Embeddings und unterbrochene Aktualisierungen; breiter Live-Index bewahrt.
- [x] Drei echte gehostete Backend-Läufe bis zum gespeicherten und bestätigten Bericht, einschließlich privater Zugriffsgrenze.
- [x] Statische Demo, lokale Fortschrittsspeicherung, Original-PDFs und Berichtsdownload ohne Besucher-Modellaufruf.
- [x] Lokale und öffentliche Browserprüfung: 3 Fälle × 2 Breiten, sechs Downloads, Wiederladen, beschädigter Fortschritt, Zurücksetzen, Rechtstexte und Architekturseite. Keine privaten Backend-Aufrufe oder Seitenfehler.
- [x] Nativer iOS-Simulator-Build mit 0 Fehlern/0 Warnungen; sieben geprüfte Screenshots und echter nativer PDF-Export mit vier Seiten.
- [x] Beispielberichte mit Quellen, Rechenwegen, Voraussetzungen und Fragen; drei Seiten pro Browser-Bericht. Alle 16 PDF-Seiten visuell geprüft.
- [x] Lokale Checks: 27 Edge-Tests, 192 Python-Tests, Mobile-Typecheck, Lease-Status-Test, Schemagenerierung und öffentliche Bundle-Isolation bestanden.
- [x] Echte Zugriffstrennung, atomare Speicherung, Revisionen, Worker-Aufträge und Dokumentfreigabe geprüft; synthetische Konten und Uploads entfernt.
- [x] README, Architekturseite, Regressionsnachweis, Kostenmessung und Modellfehler dokumentiert.
- [ ] Vollständiger Modellvergleich: Qwen EU-L40S-Kapazität nicht verfügbar; Gemini-Quote vor allen Wiederholungen erschöpft. Nur 17 Gemini-Antworten auswertbar, davon 15 mit abweichendem Termin. Keine Modellrangliste oder freie Modellfreigabe.
- [ ] Endgültige Providerrechnung/Kostenabgleich. Modal meldet bisher 0,22966928 USD Verbrauch; Gemini 0,0133723 USD nur Listenpreis-Schätzung. Kein vollständiger Ist-Kosten-Benchmark.
- [ ] Grüner gehosteter GitHub-CI-Nachweis: Konto laut Actions-Annotation wegen Abrechnungsproblem gesperrt. Lokale grüne Checks ersetzen diesen Nachweis nicht.
- [ ] Release-Tag `v1.0.0` nach den offenen Abnahmen.

[Browser-Nachweis](browser-live-verification.json) · [Native Nachweise](native/README.md) · [PDF-Prüfung](pdf-verification.json) · [Evaluation](evaluation.md) · [Abhängigkeiten](dependency-audit.json)

Keine anwaltliche Prüfung bestätigt. Die Anforderungen an freie Modellschlussfolgerungen wurden nicht erfüllt; der veröffentlichte Produktpfad formuliert ausschließlich kontrollierte Prüfergebnisse und offene Fragen. Physisches iPhone und Android wurden nicht geprüft. Sieben npm-Audit-Funde verbleiben im nativen Router beziehungsweise Expo-Build-Abhängigkeiten (drei hoch, vier mittel); kein stiller SDK-Wechsel. Die öffentliche Web-Datei importiert keinen privaten Router oder Supabase-Client. Anbieter-/Datenschutzangaben bleiben auf Nutzerwunsch sichtbar unvollständig. Dies ist keine Freigabe für echte Rechtsberatung oder Store-Einreichung.
