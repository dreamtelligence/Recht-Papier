# Native iOS captures

Captured on 10 November 2026 from the real Expo/React Native app in Xcode's iOS 26.5 Simulator. The start screen uses iPhone 17 Pro Max; the intake and case views use iPhone 17 Pro. The simulator status bar was set to 09:41 for the captures. The PNGs are direct simulator screenshots; no generated UI or retouched result text is used.

1. `01-start.png`: public start screen.
2. `02-fall-beschreiben.png`: fictional case description and selected dismissal PDF, before saving the form. The same fixture was then saved/uploaded through the normal authenticated case APIs to avoid a duplicate case.
3. `03-pruefsperre.png`: the actual persisted answer, with its failed source-check warning visible.
4. `04-rechtsgrundlagen.png`: statute sources returned by the actual retrieval run. Stored source dates are displayed as metadata, not as a claim that all statutes were freshly reviewed on capture day.

All names, companies and documents in the case are fictional. August/September 2026 dates belong to the historical fixture and are not live deadlines. No account email, token or real client document is shown.

## What this run established

The async start completed in 2.9 seconds. The answer and 11 sources arrived after approximately seven minutes, beyond the old 150-second Edge Function limit. All six required statutes in the dismissal profile were retrieved: BGB §§ 622 and 623, KSchG §§ 1, 4 and 23, and BetrVG § 102. These are statute results; this capture makes no claim of a retrieved BGH decision.

**The answer was not released.** The unchanged audit found uncited material claims. Manual inspection additionally found an impossible calendar date and unsupported conclusions about the works-council hearing. No operational deadlines were created, and document generation remained disabled. The third image records that rejection state, not a verified legal conclusion.

## Remaining gaps

Model reasoning and date calculations need a separate quality pass. Citation/audit heuristics also flag some structural wording; they were deliberately not relaxed to make this run pass. The current answer view displays Markdown as text. Android, physical-device background/resume behavior and App Store readiness were not verified in this capture task.
