# Dokumentation: Recht & Papier

## Einstieg für technische Reviewer

1. [Produkt, Screenshots und reproduzierbare Checks](../README.md).
2. [Aktuelle Architektur und tatsächliche Datenflüsse](architecture.md).
3. [JSON-Schema](../packages/shared/contract.schema.json), [kontrollierte Berechnung](../packages/shared/termination.ts) und [Berichtsrendervorgang](../packages/shared/report.ts).
4. [Release-Status mit bestandenen Prüfungen und offenen Abnahmen](portfolio/release-status.md).

## Produkt und Nachweise

| Thema | Dokument |
| --- | --- |
| Öffentlicher Umfang und bewusste Abgrenzungen | [Portfolio-Auftrag](portfolio-release-plan.md) |
| Native iPhone-Oberfläche und PDF-Export | [Native Aufnahmen](portfolio/native/README.md) |
| Produkt-Fallstudie, responsive Darstellung und Scrollregression | [Präsentation](portfolio/presentation/README.md) |
| Deterministische Referenzfälle und begrenzter Modellversuch | [Evaluation](portfolio/evaluation.md) |
| Suchdienst: Live-Versionen, 21 Suchverträge und geprüfter Datenrückweg | [Live-Index-Nachweis vom 11.11.2026](portfolio/live-index-release-2026-11-11.json) |
| Fünf amtlich abgeglichene Gesetzesbestände | [Quellen-Audit](portfolio/statute-corpus-audit-2026-11-11.json) |
| Gesamter Kandidatenbestand vor der Fensteraufteilung | [Kandidatenprüfung](portfolio/candidate-index-verification-2026-11-11.json) |
| Vollständige Endpassagen und begrenzter Latenzvergleich | [Kandidatenhärtung](portfolio/candidate-hardening-2026-11-11.json) |
| Inhaltliche Vorprüfung vorhandener Modellantworten | [Antwort-Vorprüfung](portfolio/answer-review-2026-11-11.md) |
| Tatsächlich gemessener Backend-Pfad | [Backend-Nachweis](portfolio/backend-e2e.json) |
| Providerverbrauch und Grenzen der Messung | [Kostenmessung](portfolio/cost-metering.json) |
| Unabhängige fachliche Prüfung: Auftrag und offene Fragen | [Review-Briefing](portfolio/lawyer-review-brief.md) |

## Entwicklung und Betrieb

- [Arbeitsregeln und aktueller Aufbau](../AGENTS.md).
- [Hintergrundaufträge, Lease, Callback und Rollback](analysis-jobs.md).
- [Jura: Live-Wechsel und Datenrückweg](https://github.com/dreamtelligence/Jura/blob/main/docs/live-index-release.md) sowie [nächstes serverseitiges Antwort-Gate](https://github.com/dreamtelligence/Jura/blob/main/docs/next-step-answer-release.md). Das getrennte Jura-Repository kann eine Zugangsberechtigung erfordern; die kompakten Prüfnachweise oben liegen auch in diesem Repository.
- [Datiertes Apple-Review-Readiness-Dokument](apple-app-review-readiness.md): offene Voraussetzungen, keine Store-Freigabe.
- [Migrationen](../supabase/migrations/), [Edge Functions](../supabase/functions/) und [Backend-Integrationstests](../supabase/tests/).
- [Mobile Paketkonfiguration](../apps/mobile/package.json) und [gemeinsamer Vertrag](../packages/shared/).

## Historische Einordnung

[Implementierungsstand September 2026](implementation-status.md), [frühere Agentenhinweise](history/agent-guide-before-2026-11-review.md), [frühere Claude-Hinweise](history/claude-guide-before-2026-11-review.md) und [Mockup-QA](design-qa-mockup.md) erklären frühere Entscheidungen. Sie beschreiben nicht automatisch den heutigen Ablauf. Bei Widersprüchen gelten die aktuelle Architektur, der tatsächliche Code und der Release-Status.

Referenzfälle und gespeicherte Modellantworten unter `evals/` beziehungsweise `docs/portfolio/` sind Nachweise mit begrenzter Aussagekraft. Technische Prüfergebnisse, Nutzeraussagen und eine unabhängige anwaltliche Prüfung bleiben unterschiedliche Dinge.
