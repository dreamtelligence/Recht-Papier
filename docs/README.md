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
| Tatsächlich gemessener Backend-Pfad | [Backend-Nachweis](portfolio/backend-e2e.json) |
| Providerverbrauch und Grenzen der Messung | [Kostenmessung](portfolio/cost-metering.json) |
| Unabhängige fachliche Prüfung: Auftrag und offene Fragen | [Review-Briefing](portfolio/lawyer-review-brief.md) |

## Entwicklung und Betrieb

- [Arbeitsregeln und aktueller Aufbau](../AGENTS.md).
- [Hintergrundaufträge, Lease, Callback und Rollback](analysis-jobs.md).
- [Datiertes Apple-Review-Readiness-Dokument](apple-app-review-readiness.md): offene Voraussetzungen, keine Store-Freigabe.
- [Migrationen](../supabase/migrations/), [Edge Functions](../supabase/functions/) und [Backend-Integrationstests](../supabase/tests/).
- [Mobile Paketkonfiguration](../apps/mobile/package.json) und [gemeinsamer Vertrag](../packages/shared/).

## Historische Einordnung

[Implementierungsstand September 2026](implementation-status.md), [frühere Agentenhinweise](history/agent-guide-before-2026-11-review.md), [frühere Claude-Hinweise](history/claude-guide-before-2026-11-review.md) und [Mockup-QA](design-qa-mockup.md) erklären frühere Entscheidungen. Sie beschreiben nicht automatisch den heutigen Ablauf. Bei Widersprüchen gelten die aktuelle Architektur, der tatsächliche Code und der Release-Status.

Referenzfälle und gespeicherte Modellantworten unter `evals/` beziehungsweise `docs/portfolio/` sind Nachweise mit begrenzter Aussagekraft. Technische Prüfergebnisse, Nutzeraussagen und eine unabhängige anwaltliche Prüfung bleiben unterschiedliche Dinge.
