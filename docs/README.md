# Dokumentation: Recht & Papier

## Einstieg für technische Reviewer

**Aktuelle Gegenprüfung, 16.11.2026:** [Verbraucher- und Kanzleiaudit mit priorisiertem Arbeitsplan](research/2026-11-16-product-and-kanzlei-review.md).
Die [anschließenden Korrekturen und Regressionen](research/2026-11-16-remediation.md)
schließen die reproduzierten Codefehler im unterstützten Umfang. Historische
Release-Nachweise bleiben erhalten. Der [isolierte gehostete Rollout](research/2026-11-16-isolated-rollout.md)
prüft nun den kontrollierten Ablauf mit echten Diensten; Produktionsinstallation
und fachliche Freigabe bleiben getrennt.

1. [Produkt, Screenshots und reproduzierbare Checks](../README.md).
2. [Aktuelle Architektur und tatsächliche Datenflüsse](architecture.md).
3. [JSON-Schema](../packages/shared/contract.schema.json), [kontrollierte Berechnung](../packages/shared/termination.ts) und [Berichtsrendervorgang](../packages/shared/report.ts).
4. [Release-Status mit bestandenen Prüfungen und offenen Abnahmen](portfolio/release-status.md).

## Produkt und Nachweise

| Thema | Dokument |
| --- | --- |
| Echter Auth-/Storage-/Worker-/Exportlauf, sichere Kontolöschung und vollständiger nativer PDF-Ablauf | [Isolierter gehosteter Rollout](research/2026-11-16-isolated-rollout.md) |
| Behobene Codefehler, Regressionen, Migrationen und verbleibende Rolloutabnahme | [Korrekturen vom 16.11.2026](research/2026-11-16-remediation.md) |
| Zusammengeführte Verbraucher-/Kanzleiprüfung und nächste Abnahmen | [Systemaudit vom 16.11.2026](research/2026-11-16-product-and-kanzlei-review.md) |
| Aktuell bediente öffentliche Abläufe, sechs Screenshots und PDF-Prüfung | [Sichtprüfung](research/2026-11-16-consumer-ux-audit.md) |
| Tatsächliche App-/Fallaktenfehler mit reproduzierbaren Gegenproben | [App-Audit](research/2026-11-16-app-casefile-audit.md) |
| Elf Vergleichsangebote, Primärquellen und konkreter Kanzleizielablauf | [Markt- und Workflow-Recherche](research/2026-11-16-kanzlei-market-research.md) |
| Öffentlicher Umfang und bewusste Abgrenzungen | [Portfolio-Auftrag](portfolio-release-plan.md) |
| Native iPhone-Oberfläche und PDF-Export | [Native Aufnahmen](portfolio/native/README.md) |
| Produkt-Fallstudie, responsive Darstellung und Scrollregression | [Präsentation](portfolio/presentation/README.md) |
| Deterministische Referenzfälle und begrenzter Modellversuch | [Evaluation](portfolio/evaluation.md) |
| Suchdienst: Live-Versionen, 21 Suchverträge und geprüfter Datenrückweg | [Live-Index-Nachweis vom 11.11.2026](portfolio/live-index-release-2026-11-11.json) |
| Fünf amtlich abgeglichene Gesetzesbestände | [Quellen-Audit](portfolio/statute-corpus-audit-2026-11-11.json) |
| Gesamter Kandidatenbestand vor der Fensteraufteilung | [Kandidatenprüfung](portfolio/candidate-index-verification-2026-11-11.json) |
| Vollständige Endpassagen und begrenzter Latenzvergleich | [Kandidatenhärtung](portfolio/candidate-hardening-2026-11-11.json) |
| Inhaltliche Vorprüfung vorhandener Modellantworten | [Antwort-Vorprüfung](portfolio/answer-review-2026-11-11.md) |
| Isolierter Jura-Wiederaufbau und verschlüsselte Secret-Sicherung | [Recovery-Nachweis](portfolio/recovery-drill-2026-11-11.json) |
| Tatsächlich gemessener Backend-Pfad | [Backend-Nachweis](portfolio/backend-e2e.json) |
| Providerverbrauch und Grenzen der Messung | [Kostenmessung](portfolio/cost-metering.json) |
| Unabhängige fachliche Prüfung: Auftrag und offene Fragen | [Review-Briefing](portfolio/lawyer-review-brief.md) |

## Entwicklung und Betrieb

- [Arbeitsregeln und aktueller Aufbau](../AGENTS.md).
- [Hintergrundaufträge, Lease, Callback und Rollback](analysis-jobs.md).
- [Jura: Wiederaufbau-Anleitung](https://github.com/dreamtelligence/Jura/blob/main/docs/recovery.md).
- [Jura: veröffentlichter Runtime-Code und Quellabgleich](https://github.com/dreamtelligence/Jura/blob/main/docs/runtime-source-publication.md).
- [Jura: Live-Wechsel und Datenrückweg](https://github.com/dreamtelligence/Jura/blob/main/docs/live-index-release.md) sowie [implementiertes Antwort-Gate und nächste Abnahme](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md). Das getrennte Jura-Repository kann eine Zugangsberechtigung erfordern; die kompakten Prüfnachweise oben liegen auch in diesem Repository.
- [Datiertes Apple-Review-Readiness-Dokument](apple-app-review-readiness.md): offene Voraussetzungen, keine Store-Freigabe.
- [Migrationen](../supabase/migrations/), [Edge Functions](../supabase/functions/) und [Backend-Integrationstests](../supabase/tests/).
- [Mobile Paketkonfiguration](../apps/mobile/package.json) und [gemeinsamer Vertrag](../packages/shared/).

## Historische Einordnung

[Implementierungsstand September 2026](implementation-status.md), [frühere Agentenhinweise](history/agent-guide-before-2026-11-review.md), [frühere Claude-Hinweise](history/claude-guide-before-2026-11-review.md) und [Mockup-QA](design-qa-mockup.md) erklären frühere Entscheidungen. Sie beschreiben nicht automatisch den heutigen Ablauf. Bei Widersprüchen gelten die aktuelle Architektur, der tatsächliche Code und der Release-Status.

Referenzfälle und gespeicherte Modellantworten unter `evals/` beziehungsweise `docs/portfolio/` sind Nachweise mit begrenzter Aussagekraft. Technische Prüfergebnisse, Nutzeraussagen und eine unabhängige anwaltliche Prüfung bleiben unterschiedliche Dinge.
