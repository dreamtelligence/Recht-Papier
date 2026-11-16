# Isolierter gehosteter Rollout und vollständiger Fallablauf

Stand: 16.11.2026. Der neue Quellstand wurde in einem eigenen Supabase-Projekt
und einem getrennten Modal-Worker tatsächlich ausgeführt. Ausschließlich
fiktive Unterlagen und eigens erzeugte Testkonten; das bisherige Projekt
`xmbyrsfaygwdzalkwbts`, dessen Akten und produktive Modal-Ressourcen bleiben
unverändert. Ausgangspunkt: [lokale Auditkorrekturen](2026-11-16-remediation.md).

## Gehosteter Nachweis

**22 Prüfschritte bestanden.** Anmeldung, privater Originalupload, echte
serverseitige PDF-Extraktion, bestätigte Angaben, Hintergrundauftrag,
Modal-Rückmeldung, gespeicherte Analyse, Bericht, Freigabe, Exportautorisierung,
Änderung der Fallrevision, erneute Analyse und Kontolöschung sind erreicht.
[Vollständiger maschinenlesbarer Lauf](2026-11-16-audit/evidence/isolated-rollout.json).
[Zusammengeführte Prüfungen und Quellprüfsummen](2026-11-16-isolated-rollout-checks.json).

| Grenze | Tatsächliche Beobachtung |
| --- | --- |
| Auth und Wiederaufnahme | Zwei getrennte Passwortkonten. Nach HTTP 202 neue Anmeldung; der gespeicherte Auftrag bleibt abrufbar. Kein Mail-/OTP-Zustellnachweis. |
| Original | PDF hochgeladen, über den echten Reader verarbeitet; Eigentümerdownload und kurzer Signed-URL liefern dieselben Bytes. Fremdkonto und anonymer Zugriff scheitern. |
| Serverbeleg | Direkte Änderung des extrahierten Texts/der Seiten mit Nutzertoken wird mit 403 abgewiesen. |
| Ungültige Eingabe | Widersprechender bestätigter Wert und zusätzliche ungelesene Anlage verhindern den Start mit 422; keine Analyse oder Termine aus dem fehlerhaften Wert. |
| Kontrollierter Worker | Echter Supabase-Dispatch und echter Modal-Callback. Je 16 Normtexte, zwei deterministische Vergleichsdaten, Modellkennzeichner `controlled-termination/1.0`. Kein juristischer Modellaufruf. |
| Private Ergebnisse | Gefüllte Analysen, Quellen, Termine und Berichte nur beim Eigentümer sichtbar; `owns_case` liefert für das eigene Konto true, für das fremde false und ist anonym nicht aufrufbar. |
| Export und Revision | Unbestätigter Bericht gesperrt; bestätigte aktuelle Fassung textidentisch autorisiert. Nach Eingabeänderung alte Freigabe mit 409 gesperrt; erneuter Auftrag und neuer Bericht funktionieren. |
| Kontolöschung | Identität stammt aus dem Token; eine fremde Benutzer-ID im Body löscht kein fremdes Konto. Auth-Eintrag, Fälle und Storage-Präfix danach unabhängig kontrolliert. |
| Alter Token | Nach der Löschung scheitern Auth, Edge und neuer Storageupload; administrativ kein neues Objekt sichtbar. |

Erster Auftrag: Annahme nach 5,208 Sekunden, gespeicherter Abschluss nach
12,556 Sekunden. Wiederholung nach Revision: 0,880 / 3,609 Sekunden. Zwei
synthetische Aufträge, kein Lasttest oder allgemeines Latenzversprechen.
Der frühere freie Modellpfad ist eine andere Arbeitslast und kein vergleichbarer
Geschwindigkeitsbenchmark.

Alle sechs installierten Edge Functions wurden tatsächlich aufgerufen. Der
kontrollierte Fallablauf verwendet Reader, Auftragsstart, Worker-Callback, Bericht
und Kontolöschung. Der getrennte allgemeine Recherchepfad `recht-nachschlagen`
ist anschließend mit eigener Such-URL und eigenem Testkey geprüft: anonym 401;
angemeldet 200 mit ausdrücklichem `unavailable`, leerer Antwort, keinen Zitaten
und gesperrtem Audit. Kein Analyse-/Berichtseintrag entsteht; Bericht 404 und
unbekannter Export 409. Der Status 200 allein ist keine Freigabe.
[Sechster echter Edge-Pfad und vollständige Kontobereinigung](2026-11-16-audit/evidence/isolated-proxy-unavailable.json).
[Deploymentversionen und Migrationen](2026-11-16-audit/evidence/isolated-supabase-deployment.json).

## Zusätzlich entdeckter und behobener Löschungsfehler

Die erste echte Tokenprüfung zeigte trotz erfolgreicher Auth-Löschung einen
verbliebenen Zugriff: Der alte JWT konnte weiterhin eine neue Storage-Datei
unter seiner bisherigen UUID anlegen. Auth und Edge waren bereits gesperrt.
[Ursprünglicher roter Nachweis](2026-11-16-audit/evidence/deleted-token-storage-probe.json).

Die neue Migration führt eine servereigene `profiles.deletion_pending`-Sperre
ein. Storage verlangt ein vorhandenes aktives Profil. Eine private Funktion
hält für die Storage-Transaktion eine Zeilensperre; der serverseitige Beginn
der Kontolöschung wartet laufende Zugriffe ab und setzt anschließend die
Uploadsperre, bevor Dateien gelistet werden. Normale Clients können die
Sperre weder zurücksetzen noch das Profil löschen/neu anlegen. Bei einem
Aufräumfehler bleibt die Sperre aktiv; erneute Kontolöschung setzt sie fort.

Der exakt wiederholte gehostete Versuch weist den alten Upload nun ab,
ohne ein Objekt anzulegen.
[Grüner Nachweis](2026-11-16-audit/evidence/deleted-token-storage-fixed.json).
Der lokale PostgreSQL-Test erzeugt zusätzlich ein echtes Überlappen zweier
Verbindungen: Storage-Insert offenhalten → Löschungsbeginn wartet → Insert
abschließen → Sperre setzen → späterer Insert wird abgewiesen.
Dies ersetzt keinen unbegrenzten Parallelitäts-/Lasttest des Storage-Anbieters.
Eine ergänzende echte Cloudprobe startet sechs kleine Uploads und die
Kontolöschung gleichzeitig. Alle Uploads und die Löschung antworteten 200;
nach Abschluss sämtlicher Requests waren Auth-Eintrag, Fälle und Storage-Präfix
leer. Ein anschließender alter Token erzeugte kein Objekt.
[Begrenzter gehosteter Parallelitätsnachweis](2026-11-16-audit/evidence/hosted-upload-delete-race.json).

Die gehosteten Advisors meldeten außerdem einen veränderbaren Trigger-Suchpfad
und zwei RLS-Initialisierungswarnungen. Fester Suchpfad und einmalige
Identitätsauswertung beheben diese. Eine bewusst verbleibende Warnung betrifft
die aufrufbare `SECURITY DEFINER`-Eigentumsprüfung; deren Fremd-/Anonymgrenze
wurde tatsächlich getestet.
[Advisors mit begründeter Ausnahme](2026-11-16-audit/evidence/isolated-supabase-advisors.json).

## Nativer iOS-Nachweis

Ein frisch angelegter iPhone-17-Pro-Simulator mit iOS 26.5 führte einen neuen
Release-Build mit eingebettetem JavaScript aus; kein Metro-Server. Der Build
dauerte 209,2 Sekunden, ohne Compilerfehler, mit 3.744 Warnungszeilen aus dem
nativen Build. Der eingebettete Zielmarker verweist auf das getrennte Projekt.

Tatsächliche Bedienung: Passwortanmeldung → Dateipicker → PDF-Upload →
serverseitiges Lesen → elf Belegstellen einzeln bestätigen → Analyse →
16 Quellen und zwei Vergleichsdaten → Bericht erstellen und bestätigen →
Print/Share → lokal in Dateien speichern. Keine injizierten App-Zustände.
Der vollständige freigegebene Text mit 5.410 Zeichen ist im echten, vierseitigen
iOS-PDF enthalten, einschließlich aller 16 Quellen-URLs und beider Daten.
Alle vier Seiten wurden gerendert und visuell geprüft; keine abgeschnittenen
oder überlappenden Texte beobachtet. Das Systemformat ist US Letter;
Absätze und Quellen können über Seitenumbrüche weiterlaufen.

[Sieben Screenshots und Ablauf](2026-11-16-isolated-rollout/native/README.md) ·
[Build](2026-11-16-isolated-rollout/native/build-proof.json) ·
[PDF-Prüfung](2026-11-16-isolated-rollout/native/native-pdf-proof.json) ·
[Tatsächliches natives PDF](2026-11-16-isolated-rollout/native/2026-11-16-native-export.pdf).

## Reproduktion und Bereinigung

`scripts/verify-isolated-rollout.py` hat keine Projektvorgabe und liest keine
Adminschlüssel selbst aus der CLI. Es verlangt eine private Datei mit
`isolated=true`, `supabase_url`, `anon_key`, `service_role_key` und eine
übereinstimmende `--expected-project-ref`. Das bisherige Projekt ist explizit
gesperrt. Protokolle enthalten Kontrollcodes und Prüfergebnisse, keine Tokens,
Passwörter oder echten Falldaten. Öffentliche Demoergebnisse werden nicht ersetzt.

```sh
python3 scripts/test-isolated-rollout.py
python3 scripts/verify-isolated-rollout.py \
  --credentials-file /private/path/credentials.json \
  --expected-project-ref <neue-testprojekt-ref> \
  --state-file /private/path/session.json \
  --output /private/path/isolated-rollout.json
```

Der normale Lauf entfernt seine Konten, Fälle und Originale auch nach Fehlern.
Ein unterbrochener Cleanup lässt sich mit denselben Argumenten und `--cleanup`
fortsetzen. Das optional für die native Prüfung behaltene Konto ist ein
separates drittes fiktives Konto; seine Zugangsdaten bleiben außerhalb des
Repositorys in einer Datei mit Modus 600. Die beiden Hauptkonten sind bereits
im API-Nachweis entfernt. Auch das native Konto samt allen UI-Fällen und Dateien
ist anschließend entfernt: Auth 404, leeres Storage-Präfix, keine eigenen Fälle.
[Abschließender Kontonachweis](2026-11-16-audit/evidence/isolated-native-cleanup.json).
Der eigene Simulator, seine DerivedData und privaten Sitzungsdateien sind
entfernt; vorhandene Geräte und Builds wurden nicht verändert.

Vor der Projektlöschung wurden Authkonten, Profile, Fälle, Storage-Objekte und
Hintergrundjobs erneut gezählt: jeweils **null**. Das ausschließlich hier
erzeugte Supabase-Projekt wurde anschließend gelöscht; eine frische Projektliste
enthält es nicht mehr. Auch sein privates lokales Verzeichnis mit Credentials
und Secret-Dateien ist entfernt.
[Abschließende Projektbereinigung](2026-11-16-audit/evidence/isolated-project-cleanup.json).

Die Organisation wurde vom Nutzer ausdrücklich als Dreamtelligence gewählt;
deren Free-Tarif wurde über die Organisations-API geprüft. Neues Supabase-Projekt:
0 USD, kein Tarifwechsel. Modal-Testressourcen und Kostenannahmen stehen im
[Jura-Rolloutbericht](https://github.com/dreamtelligence/Jura/blob/main/docs/isolated-rollout-2026-11-16.md).
Keine produktiven Schlüssel wurden in die neuen Modal-Ressourcen übernommen.
Auch die Modal-Bereinigung ist unabhängig geprüft: alle acht eigenen Apps
gestoppt und ohne laufende Tasks; 20 gezielte Abfragen nach den eigenen Secrets,
Volumes und Dicts liefern `NotFound`. Fünf ausschließlich für diesen Lauf
erzeugte lokale Credential-/Callbackdateien sind entfernt.
[Modal-Abschlussnachweis](https://github.com/dreamtelligence/Jura/blob/main/docs/rollout-2026-11-16/final-modal-cleanup.json).

## Getrennte Prüfung des allgemeinen Suchindex

Der vorhandene unveränderliche Index wurde unabhängig aus dem gesicherten
Archiv aufgebaut: **17.132 Vektor-/Payloadzuordnungen und 21/21 Suchverträge
bestanden**. Tatsächlich gemessener CPU-Container in EU-West, kein CUDA;
gleiche festgelegte BGE-M3-/Rerankerrevisionen. Validator: 757,092 Sekunden,
davon 679,68 Sekunden für die Suchfälle. Das ist kein GPU-Leistungsvergleich
und keine neue fachliche Prüfung aller enthaltenen Gesetze.

Nach dem korrigierten Cloud-Start bestehen dieselben **21/21 Verträge über den
echten authentifizierten HTTP-Endpunkt**; Summe der Fallzeiten 663,259 Sekunden.
Authentifizierung und Indexidentität sind zusätzlich geprüft. Der tatsächlich
gestartete Suchcontainer läuft ohne CUDA in EU-South, der Webcontainer in
EU-West. Weder Validator noch gehostete Dienste erhalten Textmodell-Zugangsdaten.

Tatsächliche POST-Anfragen an JSON- und SSE-Endpunkt verwenden einen fiktiven
Falltext mit 1.933 Zeichen. Beide antworten HTTP 200, aber ausdrücklich
`released=false`, `release_status=unavailable` und ohne Antworttext. SSE sendet
kein Tokenereignis; interne Plan-Queries fehlen in der Ausgabe. Bei diesen
Anfragen gab es keine 303-Weiterleitung; die frühere 303-Regression bleibt ein
getrennter kontrollierter Transporttest.

Der frische HTTP-Start deckte anschließend einen Import vor der Cloud-
Suchpfadinitialisierung auf. Die korrigierte Importreihenfolge besitzt einen
isolierten Subprocess-Regressionstest. Unveränderte Runtimehashes und die
separaten Deploymentänderungen bleiben getrennt attestiert. Der unabhängige
Review ergänzt außerdem vollständige Zielnamenprüfung vor jeglichem Aufräumen;
ein eingeschleuster fremder Name darf keinen externen Löschaufruf erreichen.
Details und abschließender HTTP-/Ressourcenstatus stehen im
[Jura-Rolloutbericht](https://github.com/dreamtelligence/Jura/blob/main/docs/isolated-rollout-2026-11-16.md).

## Grenzen und nächster Produktionsschritt

Der gehostete kontrollierte Pfad ist vom breiten Suchindex und dessen
GPU-/CPU-Quellenprüfung getrennt. Die öffentliche Produkt-Fallstudie behält
ihre bisherigen gespeicherten Beispiele und PDFs. Ein neuer Simulatorlauf
beweist kein physisches iPhone oder Android-Gerät.

Vor einer produktiven Aktualisierung Migrationen und Functions gemeinsam
versionieren: kompatibler Reader mit Serverpersistenz, neue Migrationen,
RPC-verwendende Functions und neuer nativer Build. Alte abgeleitete Belegtexte
werden durch die Herkunftsmigration verworfen; Originale bleiben erhalten
und müssen erneut gelesen werden. Produktive Daten wurden hier nicht migriert.

Offen bleiben anwaltliche Abnahme, Provider-/Datenschutzverträge, physische
Geräte und vollständige Supabase-Wiederherstellung. Kanzleimodus, DOCX,
Mandatsannahme und beA bleiben geplante Erweiterungen.

## Veröffentlichung und CI

Recht-Papier `8fce84e` und Jura `6d148df` sind auf GitHub `main` gepusht;
Remote-SHAs und saubere Arbeitsverzeichnisse sind geprüft.
[Publikationsprotokoll](2026-11-16-isolated-rollout-publication.json).
Der [frische GitHub-CI-Lauf](https://github.com/dreamtelligence/Recht-Papier/actions/runs/43919496346)
startete erneut keinen der drei Jobs: Das Konto ist wegen eines
Abrechnungsproblems gesperrt, laut jeweiliger Annotation. Das ist kein
ausgeführter fehlgeschlagener Test und kein grüner CI-Nachweis. Die lokalen
und separat gehosteten Prüfungen oben sind davon unabhängig.
