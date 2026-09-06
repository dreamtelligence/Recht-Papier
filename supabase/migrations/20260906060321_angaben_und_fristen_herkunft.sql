-- Eine bestätigte Angabe trägt später ein Schreiben. Dann muss auch stimmen,
-- woher sie kommt. Bisher durfte der Client `origin` frei setzen und eine vom
-- Modell extrahierte Aussage als eigene Angabe ausgeben — oder umgekehrt.
-- Dieselbe Lücke bestand bei `case_deadlines.basis`: eine Rechtsgrundlage,
-- die der Client selbst schreiben kann, ist keine.
--
-- Dieselbe Regel wie schon bei `cases` und `case_analyses`: Spalten, die der
-- Server führt, sind für `authenticated` nicht schreibbar.

revoke insert, update on public.case_facts from anon, authenticated;
-- `origin` bleibt beim Default 'nutzer', `confirmed` beim Default false.
grant insert (case_id, statement, occurred_on) on public.case_facts to authenticated;
grant update (statement, occurred_on, confirmed) on public.case_facts to authenticated;

-- Fristen entstehen ausschließlich aus einer freigegebenen Analyse. Der
-- Mandant bestätigt sie oder schreibt eine Notiz dazu; Datum, Bezeichnung und
-- Rechtsgrundlage gehören ihm nicht.
revoke insert, update on public.case_deadlines from anon, authenticated;
grant update (confirmed, note) on public.case_deadlines to authenticated;
