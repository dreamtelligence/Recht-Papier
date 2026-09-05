# Apple App Review Readiness

Stand: 5. September 2026. Geprüft wurden ausschließlich aktuelle Primärquellen von Apple
sowie der derzeitige Stand in `apps/mobile`, `supabase` und der Jura-Engine. Dies ist eine
technische Review-Einschätzung, keine Rechtsberatung und keine Freigabegarantie durch Apple.

## Ergebnis

**Der eingeschlagene Weg ist grundsätzlich App-Store-fähig.** Ein echter Expo-/React-Native-
Client mit Fallakte, Dokumentimport, bestätigbaren Fakten, Analyse und Quellen ist keine bloße
WebView und bietet voraussichtlich genügend eigenständigen Nutzen für Guideline 4.2. Expo,
Supabase in Frankfurt und eine getrennte Jura-API sind für sich keine Ablehnungsgründe.

**Der heutige Build ist aber noch nicht einreichbar.** Unter `apps/mobile` liegt erst das
Expo-Gerüst: Es fehlen Produktoberfläche, Bundle-ID, produktive Auth-/API-Anbindung, StoreKit,
Kontolöschung, Datenschutzoberflächen und ein prüfbarer Release-Build. Der Weg ist damit grün,
die aktuelle Submission Readiness rot.

Die größten Ablehnungsrisiken sind:

1. ein Verbraucherabo außerhalb von In-App Purchase,
2. fehlende vollständige Kontolöschung in der App,
3. Falldaten, die ohne konkrete Offenlegung und Einwilligung an externe LLM-Anbieter gehen,
4. Einreichung über einen Individual- statt Organization-Developer-Account,
5. unvollständige Privacy-Angaben oder Privacy-Manifeste,
6. ein für den Reviewer nicht erreichbares Backend.

## Harte technische Launch-Gates

| Gate | Was für Recht & Papier vor der Einreichung gelten muss | Stand |
|---|---|---|
| Nativer Produktumfang | Die App muss deutlich mehr als eine verpackte Website liefern. Der geplante native Fallakten-Flow erfüllt das plausibel; eine WebView des alten Prototyps nicht. Apple verlangt eigenständigen Nutzen und eine „app-like“ Oberfläche ([Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/)). | Noch nicht implementiert |
| Vollständiger Release-Build | Keine Platzhalter, Abstürze oder unfertigen Funktionen. Seit 28. April 2026 müssen Uploads mit Xcode 26 oder neuer und iOS-26-SDK oder neuer gebaut sein ([Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)). Die EAS-Build-Umgebung muss dies nachweislich verwenden. | Offen |
| Geräteumfang | In `app.json` steht derzeit `supportsTablet: true`. Dann muss die App auch auf iPad vollständig und sauber funktionieren. Andernfalls vor der ersten Einreichung bewusst auf iPhone begrenzen. | Entscheidung/Test offen |
| StoreKit-Abo | Automatisierte Rechtsanalyse und Cloud-Fallakte sind digitale, in der App verbrauchte Leistungen. Das Verbraucherabo muss daher als In-App Purchase/StoreKit-Abo angeboten werden; die Reader- und Enterprise-Ausnahmen passen nicht. Das Abo braucht laufenden Wert, mindestens sieben Tage Laufzeit, geräteübergreifenden Zugang, klare Leistung/Preise und Wiederherstellung ([Guidelines 3.1.1–3.1.3](https://developer.apple.com/app-store/review/guidelines/)). Der einfachste sichere Start ist IAP ohne Web-Checkout-Links. | Nicht vorhanden |
| Login | Nur eigenes Supabase-E-Mail-/Passwort-Login benötigt kein Sign in with Apple. Sobald Google, Facebook oder ein anderer Social Login den Primäraccount anlegt, muss eine gleichwertige datensparsame Login-Option angeboten werden; Sign in with Apple ist dafür der sichere Standard ([Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/)). | Auth-UI fehlt |
| Kontolöschung | Wer in der App Konten anlegen kann, muss dort die vollständige Löschung initiieren können. Deaktivierung allein reicht nicht. Zu löschen sind Auth-Konto, Profil, Fälle, Dokumentobjekte, Fakten, Analysen und Quellen sowie nach der erklärten Frist Logs/Backups, soweit keine gesetzliche Aufbewahrung greift. Bei aktivem Abo muss die App auf Apples fortlaufende Abrechnung und Aboverwaltung hinweisen, darf aber eine sofortige Löschung anbieten ([Apple Account Deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)). Die SQL-Cascades helfen, ein Storage-/Auth-Löschpfad fehlt noch. | Nicht vorhanden |
| Review-Zugang | Apple braucht ein dauerhaft gültiges Demo-Konto oder einen vollständigen Demo-Modus, alle nötigen Hinweise und ein während des Reviews erreichbares Backend. IAPs müssen sichtbar und funktionsfähig sein ([Guideline 2.1 und Before You Submit](https://developer.apple.com/app-store/review/guidelines/)). Ein sinnvoller Review-Fall enthält anonymisierte Beispieldokumente, bestätigte Fakten und eine fertige Analyse. | Nicht vorhanden |
| Netzwerk | Supabase und Jura müssen über öffentlich gültiges HTTPS erreichbar sein; keine pauschale ATS-Ausnahme. App Transport Security blockiert unsichere Verbindungen, Ausnahmen können zusätzliche Prüfung auslösen ([Apple: Preventing Insecure Network Connections](https://developer.apple.com/documentation/security/preventing-insecure-network-connections)). Außerdem verlangt Apple Funktion auf IPv6-only-Netzen ([Guideline 2.5.5](https://developer.apple.com/app-store/review/guidelines/)). | Produktionsendpunkte offen |
| Dateiimport | Der Import soll den System-Dateiauswahldialog verwenden und Dateien/iCloud einbeziehen, statt pauschalen Foto- oder Dateizugriff anzufordern. Apple verlangt Datenminimierung und bevorzugt Out-of-Process-Picker; Dateiauswahl soll Files/iCloud unterstützen ([Guidelines 5.1.1(iii) und 2.5.15](https://developer.apple.com/app-store/review/guidelines/)). | Paket und Flow fehlen |
| Privacy-Manifeste | Der finale Archive-Build muss gültige `PrivacyInfo.xcprivacy`-Dateien und genehmigte Gründe für alle Required-Reason-APIs enthalten. Ungültige Manifeste beziehungsweise nicht erklärte Required-Reason-APIs blockieren den Upload. Apple führt Hermes ausdrücklich als SDK mit Manifest-/Signaturpflicht ([Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)). Vor Release deshalb den Xcode-Privacy-Report des tatsächlichen EAS-Artefakts prüfen. | Erst am Release-Archive prüfbar |
| Export Compliance | Wegen HTTPS und System-Kryptografie müssen die Export-Compliance-Fragen in App Store Connect korrekt beantwortet werden. `ITSAppUsesNonExemptEncryption=false` darf nur gesetzt werden, wenn nach Prüfung aller nativen Libraries tatsächlich ausschließlich ausgenommene Kryptografie verwendet wird ([Apple Export Compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)). | Offen |
| EU-Traderstatus | Für einen gewerblichen Verbraucher-Abodienst ist „Trader“ sehr wahrscheinlich. Apple verlangt die Erklärung und Verifizierung; Adresse, Telefon und E-Mail werden auf der EU-Produktseite veröffentlicht. Zahlungsdaten und die Bestätigung der EU-Rechtskonformität gehören ebenfalls dazu ([Apple DSA Trader Requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)). | Offen |

## Datenschutz und Falldokumente

Alle Apps benötigen einen Privacy-Policy-Link in App Store Connect **und** leicht erreichbar in
der App. Die Policy muss Datenerhebung, Zwecke, Empfänger, gleichwertigen Schutz bei Partnern,
Aufbewahrung/Löschung sowie Widerruf erklären ([Guideline 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)).
Die App-Privacy-Antworten müssen auch das Verhalten eingebundener Partner abdecken und aktuell
gehalten werden ([Apple: Manage App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)).

Für den geplanten Stand sind typischerweise mindestens folgende Privacy-Label-Angaben nötig:

- E-Mail-Adresse und User ID,
- Other User Content für Fallbeschreibung, Chat/Fakten und allgemeine Dokumentinhalte,
- je nach ausdrücklich unterstütztem Uploadtyp Photos or Videos,
- Purchase History,
- gegebenenfalls Search History, Diagnostics und Product Interaction, falls diese gespeichert
  oder durch Telemetrie erhoben werden.

Da diese Daten in Supabase mit dem Konto verknüpft gespeichert werden, sind sie regelmäßig
„linked to the user“ und für „App Functionality“ erhoben. Apple definiert eine Übertragung vom
Gerät mit Speicherung über die reine Echtzeitbearbeitung hinaus als „collect“ und ordnet freie
Texte „Other User Content“ zu ([Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)).
Enthält ein freies Dokument zufällig Gesundheits- oder andere sensible Daten, muss nicht jede
mögliche Freitexteingabe einzeln erraten werden. Fragt die App solche Daten gezielt ab, ist aber
die jeweilige konkrete Kategorie anzugeben.

### Entscheidender AI-Datenfluss

Apple verlangt eine klare Offenlegung, **wo und wie** personenbezogene Daten genutzt werden,
und vor der Weitergabe an Dritte ausdrücklich auch an „third-party AI“ eine explizite Erlaubnis
([Guideline 5.1.2(i)–(ii)](https://developer.apple.com/app-store/review/guidelines/)).

Jura unterstützt derzeit Gemini sowie Fallbacks zu DeepSeek und Anthropic. Wenn Nutzerfrage,
Falldaten oder Dokumentauszüge diese Anbieter erreichen, braucht die App vor dem ersten Transfer
eine konkrete, kontextuelle Einwilligung mit benannten Empfängern und Zweck. Ein stiller Wechsel
auf einen anderen Fallback-Anbieter ist nicht releasefähig, wenn dieser nicht ebenfalls offengelegt
und von der Einwilligung gedeckt ist. Der einfachste sichere Produktionsweg ist ein fest
konfigurierter, offengelegter Anbieter ohne stillen Cross-Provider-Fallback; noch besser ist ein
selbst gehostetes Modell innerhalb derselben verantwortlichen Einheit.

Zusätzlich sind als Mindestschutz sinnvoll und mit Apples allgemeinem Security-Gebot vereinbar:

- kein Supabase-Service-Role-Key im Client,
- Autorisierung und Mandantentrennung auch am Jura-Endpunkt, nicht nur in Supabase RLS,
- kurzlebige signierte Dokument-URLs,
- keine Fallinhalte in Push-Nachrichten oder Diagnose-Logs,
- durchgängige Löschung von Datenkopien entlang Supabase → Storage → Jura/LLM-Logs/Backups.

Apple verlangt angemessene Maßnahmen gegen unbefugte Nutzung, Offenlegung und Zugriff
([Guideline 1.6](https://developer.apple.com/app-store/review/guidelines/)). Der vorhandene echte
RLS-Isolationstest ist dafür ein guter Baustein, deckt Jura, Storage, Logs und Backups aber noch
nicht ab.

## AI-, Inhalts- und Legal-Review-Risiken

### AI-Ausgaben

Apple verbietet Legal-AI nicht ausdrücklich. Chatbots fallen jedoch potenziell unter Guideline
4.7; Apple erwartet dort Privacy-Schutz, Filterung problematischer Inhalte und Melde-/Reaktionswege
([Guideline 4.7](https://developer.apple.com/app-store/review/guidelines/)). Für einen einzelnen
First-party-Assistenten ist die volle Plattformregel auslegungsbedürftig. Der risikoarme minimale
Umfang ist daher:

- serverseitige Input-/Output-Safety,
- sichtbare Aktion „Antwort melden“ mit bearbeitbarem Supportkanal,
- Abuse-Sperre,
- keine Garantien zu Richtigkeit, Erfolg oder Fristen,
- Quellen und Rechtsstand sichtbar; Eskalationshinweis bei Fristen und hohem Risiko.

Private Falltexte sind zwar „User Content“ für das Privacy Label, aber nicht automatisch eine
öffentliche UGC-Plattform nach Guideline 1.2. Eine Social-Moderationssuite ist daher nicht nötig,
solange Nutzerinhalte nicht veröffentlicht oder zwischen fremden Nutzern geteilt werden.

Der neue Age-Rating-Fragebogen muss AI-Assistent und Chatfunktion sowie die mögliche Häufigkeit
sensibler Inhalte korrekt berücksichtigen ([Apple: Updated Age Ratings](https://developer.apple.com/news/?id=ks775ehf)).

### Rechtsdienstleistung und verantwortliche Einheit

Apple verlangt für Apps, die sensible Nutzerinformationen benötigen, die Einreichung durch die
rechtlich verantwortliche Anbieter-Entität, die den Dienst erbringt, statt durch einen
Individual Developer
([Guideline 5.1.1(ix)](https://developer.apple.com/app-store/review/guidelines/)). Da eine
Rechtsfallakte regelmäßig vertrauliche und teils hochsensible Inhalte enthält, sollte ein
**von Apple bestätigtes Einreichungsmodell als Release-Gate** behandelt werden.

Für EMBER besteht dabei ein konkreter Klärungspunkt: Apple weist Einzelunternehmen ausdrücklich
dem Individual-Account zu; für einen Organization-Account verlangt Apple eine eigenständige
Legal Entity und D-U-N-S-Prüfung ([Apple Program Enrollment](https://developer.apple.com/help/account/membership/program-enrollment)).
Das kollidiert mit Apples Empfehlung für Apps mit sensiblen Daten. Vor der Implementierung des
Store-Releasepfads sollte deshalb ein 30-minütiger
[App-Review-Termin](https://developer.apple.com/app-store/review/) genau diese Konstellation
klären. Falls Apple einen Organization-Account verlangt, muss die tatsächlich verantwortliche
Anbieterin eine von Apple akzeptierte Rechtsform haben oder der Dienst von einer geeigneten
Partner-Entität eingereicht und verantwortet werden.

Apples Regeln enthalten keine spezielle Legal-AI-Lizenz. Sie verlangen aber die Einhaltung aller
lokalen Gesetze in jedem Vertriebsgebiet ([Guideline 5](https://developer.apple.com/app-store/review/guidelines/)).
Deshalb bleibt das fachanwaltlich bestätigte RDG-Leistungsbild ein eigener Go/No-Go-Punkt. Ein
Disclaimer „keine Rechtsberatung“ heilt keine Funktion, die tatsächlich unzulässige individuelle
Rechtsdienstleistung erbringt. App-Name, Screenshots und Beschreibung dürfen weder eine
„KI-Anwältin“ noch garantierte Genauigkeit, Erfolgschancen oder Fristsicherheit behaupten.

Wenn Jura oder Rechtsquellen als Drittservices bzw. Drittinhalte verwendet werden, müssen die
nötigen Nutzungsrechte bestehen; Apple kann eine Autorisierung verlangen
([Guidelines 5.2.1–5.2.2](https://developer.apple.com/app-store/review/guidelines/)). Das
Leistungsbild, die verantwortliche juristische Person, der AI-Datenfluss und gegebenenfalls
fachliche Nachweise gehören knapp und konkret in die App Review Notes.

## Go/No-Go vor dem ersten Review

Erst einreichen, wenn alle folgenden Punkte mit dem tatsächlichen Release-Archive geprüft sind:

- [ ] Echter nativer Ende-zu-Ende-Flow statt Expo-Gerüst oder WebView
- [ ] Von Apple bestätigte Einreichungs-Entität; Organization-Account, falls Apple ihn verlangt
- [ ] Xcode 26+/iOS-26-SDK+, stabile Bundle-ID, Signierung und On-Device-Test
- [ ] iPad vollständig unterstützt oder `supportsTablet` bewusst deaktiviert
- [ ] StoreKit-Abo samt Restore, geräteübergreifendem Entitlement und klaren Konditionen
- [ ] Eigener Login oder Social Login plus Sign in with Apple
- [ ] In-App-Löschung für Auth, Datenbank, Storage und nachgelagerte Kopien
- [ ] Privacy Policy in App und Store; vollständige Privacy Labels
- [ ] Explizite Einwilligung vor jedem externen AI-Datenfluss; keine undisclosed Fallbacks
- [ ] Valide SDK-/App-Privacy-Manifeste und Required-Reason-Erklärungen im Archive
- [ ] ATS-konformes HTTPS, IPv6-Test und autorisierter Jura-Endpunkt
- [ ] Demo-Konto mit Beispieldaten; Supabase, Jura und IAP während Review erreichbar
- [ ] Export-Compliance korrekt beantwortet
- [ ] EU-Traderstatus verifiziert
- [ ] Korrektes Age Rating, Safety-/Meldeweg und wahrheitsgemäße Metadaten
- [ ] Fachanwaltliche RDG-Freigabe des tatsächlich ausgelieferten Funktionsumfangs

**Gesamturteil:** Technisch kann dieser Weg erfolgreich durch Apple Review gehen. Kein
Architekturwechsel ist nötig. Vor dem App-Client sollte aber der verbindliche Produktions-
Datenfluss Supabase → Jura → LLM entschieden werden; er bestimmt Einwilligung, Privacy Label,
Policy, Anbieteraccount und einen erheblichen Teil des Review-Risikos.
