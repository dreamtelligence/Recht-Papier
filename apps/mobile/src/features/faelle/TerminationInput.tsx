import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Fact, Input } from "@portfolio/contract";
import { displayValue, extractTerminationFacts, FACT_LABELS, FACT_OPTIONS } from "@portfolio/termination";
import { Body, Field, Message, Muted, PrimaryAction, SecondaryAction } from "@/ui";
import { colors } from "@/theme";
import { dokumentLesen, saveTerminationInput } from "./api";
import type { CaseDocument } from "./typen";

export function TerminationInput({ caseId, input, documents, onSaved }: {
  caseId: string; input: Input | null; documents: CaseDocument[]; onSaved: () => Promise<boolean>;
}) {
  const [facts, setFacts] = useState<Fact[]>(() => input?.facts ?? extractTerminationFacts(documents.map(d => ({
    id: d.id, extracted_text: d.extracted_text ?? "", extracted_pages: d.extracted_pages ?? undefined,
  }))));
  const [asOf, setAsOf] = useState(input?.as_of ?? new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState<Fact["key"]>("receipt_on");
  const [value, setValue] = useState("");
  const [quote, setQuote] = useState("");
  const [docId, setDocId] = useState(documents[0]?.id ?? "");
  const [page, setPage] = useState("1");
  const [expanded, setExpanded] = useState(!input?.facts.length);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (dirty) return;
    setFacts(input?.facts ?? extractTerminationFacts(documents.map(d => ({
      id: d.id, extracted_text: d.extracted_text ?? "", extracted_pages: d.extracted_pages ?? undefined,
    }))));
    if (input) setAsOf(input.as_of);
  }, [input, documents, dirty]);
  function editFacts(next: Fact[]) { setDirty(true); setFacts(next); }
  async function save() {
    setBusy(true); setMessage("");
    try { await saveTerminationInput(caseId, { version: "1.0", as_of: asOf, facts }); if (!await onSaved()) { setMessage("Angaben gespeichert, aber die Akte konnte nicht neu geladen werden. Bitte erneut öffnen."); return; } setDirty(false); setMessage("Gespeichert. Jede Änderung macht die bisherige Prüfung veraltet."); }
    catch { setMessage("Angaben konnten nicht gespeichert werden."); }
    finally { setBusy(false); }
  }
  async function reread() {
    setBusy(true); setMessage("");
    try { for (const document of documents) await dokumentLesen(document.id); }
    catch { setMessage("Das PDF konnte nicht erneut gelesen werden. Unterstützt werden PDFs mit Textebene; Scans benötigen künftig OCR."); }
    finally {
      try { if (!await onSaved()) setMessage("Der Dokumentstatus konnte nicht neu geladen werden. Bitte die Fallakte erneut öffnen."); }
      catch { setMessage("Der Dokumentstatus konnte nicht neu geladen werden. Bitte die Fallakte erneut öffnen."); }
      finally { setBusy(false); }
    }
  }
  const retryAvailable = documents.some(d => !d.extracted_pages?.length || d.processing_error);
  if (!expanded) return <View style={{ gap: 10 }}>
    <Body>{facts.filter(f => f.confirmed).length} bestätigte Angaben mit Dokumentbelegen · Stichtag {asOf}</Body>
    {retryAvailable ? <SecondaryAction label="PDF-Texte erneut lesen" onPress={() => void reread()} disabled={busy} /> : null}
    <Message>{message}</Message>
    <SecondaryAction label="Angaben und Belegstellen ansehen oder ändern" onPress={() => setExpanded(true)} />
  </View>;
  return <View style={{ gap: 14 }}>
    {input ? <SecondaryAction label="Angaben einklappen" onPress={() => setExpanded(false)} /> : null}
    <Muted>Nur bestätigte Angaben mit einer Belegstelle werden für Fristen verwendet. Freitextangaben bleiben davon getrennt. Unterstützt: ordentliche Arbeitgeberkündigung, gesetzliche Fristen ohne Probezeit/Sonderfall; Klagefrist für NRW 2026/2027.</Muted>
    <Muted>Die technische Prüfung unterstützt nur die beschrifteten Felder der Demo-Unterlagen, etwa „Zugang am: 2026-08-31“. Wert, Feld und wörtlicher Originalbeleg müssen zusammenpassen. Allgemeiner Fließtext und selbst formulierte rechtliche Bewertungen werden noch nicht geprüft.</Muted>
    <Field label="Analysestichtag (JJJJ-MM-TT)" value={asOf} onChangeText={value => { setDirty(true); setAsOf(value); }} />
    {facts.map((fact, index) => <View key={`${fact.key}-${index}`}><Pressable accessibilityRole="checkbox"
      accessibilityState={{ checked: fact.confirmed }} onPress={() => editFacts(facts.map((f, i) => i === index ? { ...f, confirmed: !f.confirmed } : f))}
      style={{ padding: 12, borderWidth: 1, borderColor: colors.line, gap: 6 }}>
      <Body>{FACT_LABELS[fact.key]}: {displayValue(fact.value)}</Body>
      <Muted>Seite {fact.evidence.page}: „{fact.evidence.quote}“</Muted>
      <Text style={{ color: colors.accentDark }}>{fact.confirmed ? "✓ Bestätigt · Antippen nimmt zurück" : "Angabe bestätigen"}</Text>
    </Pressable><SecondaryAction label="Angabe entfernen" onPress={() => editFacts(facts.filter((_, i) => i !== index))} /></View>)}
    {!facts.length ? <Muted>Keine automatisch erkannten Angaben. Erfassen Sie Werte und Originalbelege unten. Unbekannte Angaben dürfen offenbleiben.</Muted> : null}
    {retryAvailable ? <SecondaryAction label="PDF-Texte lesen / erneut versuchen" onPress={() => void reread()} disabled={busy} /> : null}
    <SecondaryAction label={editing ? "Eingabe schließen" : "Angabe mit Originalbeleg ergänzen"} onPress={() => setEditing(!editing)} />
    {editing ? <View style={{ gap: 10 }}>
      {(Object.entries(FACT_LABELS) as [Fact["key"], string][]).map(([k, label]) => <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: key === k }} onPress={() => { setKey(k); setValue(""); }} style={{ minHeight: 44, justifyContent: "center" }}><Body>{key === k ? "● " : "○ "}{label}</Body></Pressable>)}
      {FACT_OPTIONS[key] ? FACT_OPTIONS[key]!.map(option => <SecondaryAction key={option} label={`${value === option ? "✓ " : ""}${displayValue(option)}`} onPress={() => setValue(option)} />) : <Field label="Datum (JJJJ-MM-TT)" value={value} onChangeText={setValue} />}
      {documents.map(d => <SecondaryAction key={d.id} label={`${docId === d.id ? "✓ " : ""}${d.file_name}`} onPress={() => setDocId(d.id)} />)}
      <Field label="Seite" keyboardType="number-pad" value={page} onChangeText={setPage} />
      <Field label="Wörtliche Belegstelle" multiline value={quote} onChangeText={setQuote} />
      <SecondaryAction label="Unbestätigte Angabe hinzufügen" disabled={!value.trim() || !quote.trim() || !docId || !Number.isInteger(Number(page)) || Number(page) < 1} onPress={() => {
        editFacts([...facts, { key, value: value.trim(), confirmed: false, evidence: { document_id: docId, page: Number(page), quote: quote.trim() } }]); setQuote(""); setValue(""); setEditing(false);
      }} />
    </View> : null}
    <PrimaryAction label={busy ? "Wird gespeichert …" : "Angaben und Bestätigungen speichern"} disabled={busy} onPress={() => void save()} />
    <Message>{message}</Message>
  </View>;
}
