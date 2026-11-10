import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Fact, Input } from "@portfolio/contract";
import { displayValue, extractTerminationFacts, FACT_LABELS, FACT_OPTIONS } from "@portfolio/termination";
import { Body, Field, Message, Muted, PrimaryAction, SecondaryAction } from "@/ui";
import { colors } from "@/theme";
import { dokumentLesen, saveTerminationInput } from "./api";
import type { CaseDocument } from "./typen";

export function TerminationInput({ caseId, input, documents, onSaved }: {
  caseId: string; input: Input | null; documents: CaseDocument[]; onSaved: () => void;
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
  async function save() {
    setBusy(true); setMessage("");
    try { await saveTerminationInput(caseId, { version: "1.0", as_of: asOf, facts }); onSaved(); setMessage("Gespeichert. Jede Änderung macht die bisherige Prüfung veraltet."); }
    catch { setMessage("Angaben konnten nicht gespeichert werden."); }
    finally { setBusy(false); }
  }
  async function reread() {
    setBusy(true); setMessage("");
    try { for (const document of documents) await dokumentLesen(document.id); onSaved(); }
    catch { setMessage("Das PDF konnte nicht erneut gelesen werden. Unterstützt werden PDFs mit Textebene; Scans benötigen künftig OCR."); }
    finally { setBusy(false); }
  }
  if (!expanded) return <View style={{ gap: 10 }}>
    <Body>{facts.filter(f => f.confirmed).length} bestätigte Angaben mit Dokumentbelegen · Stichtag {asOf}</Body>
    <SecondaryAction label="Angaben und Belegstellen ansehen oder ändern" onPress={() => setExpanded(true)} />
  </View>;
  return <View style={{ gap: 14 }}>
    {input ? <SecondaryAction label="Angaben einklappen" onPress={() => setExpanded(false)} /> : null}
    <Muted>Nur bestätigte Angaben mit einer Belegstelle werden für Fristen verwendet. Freitextangaben bleiben davon getrennt. Unterstützt: ordentliche Arbeitgeberkündigung, gesetzliche Fristen ohne Probezeit/Sonderfall; Klagefrist für NRW 2026/2027.</Muted>
    <Field label="Analysestichtag (JJJJ-MM-TT)" value={asOf} onChangeText={setAsOf} />
    {facts.length ? <SecondaryAction label="Alle sichtbaren Angaben bestätigen" onPress={() => setFacts(facts.map(f => ({ ...f, confirmed: true })))} /> : null}
    {facts.map((fact, index) => <View key={`${fact.key}-${index}`}><Pressable accessibilityRole="checkbox"
      accessibilityState={{ checked: fact.confirmed }} onPress={() => setFacts(facts.map((f, i) => i === index ? { ...f, confirmed: !f.confirmed } : f))}
      style={{ padding: 12, borderWidth: 1, borderColor: colors.line, gap: 6 }}>
      <Body>{FACT_LABELS[fact.key]}: {displayValue(fact.value)}</Body>
      <Muted>Seite {fact.evidence.page}: „{fact.evidence.quote}“</Muted>
      <Text style={{ color: colors.accentDark }}>{fact.confirmed ? "✓ Bestätigt · Antippen nimmt zurück" : "Angabe bestätigen"}</Text>
    </Pressable><SecondaryAction label="Angabe entfernen" onPress={() => setFacts(facts.filter((_, i) => i !== index))} /></View>)}
    {!facts.length ? <Muted>Keine automatisch erkannten Angaben. Erfassen Sie Werte und Originalbelege unten. Unbekannte Angaben dürfen offenbleiben.</Muted> : null}
    {documents.some(d => !d.extracted_pages) ? <SecondaryAction label="Dokumentseiten für Belegstellen lesen" onPress={() => void reread()} disabled={busy} /> : null}
    <SecondaryAction label={editing ? "Eingabe schließen" : "Angabe mit Originalbeleg ergänzen"} onPress={() => setEditing(!editing)} />
    {editing ? <View style={{ gap: 10 }}>
      {(Object.entries(FACT_LABELS) as [Fact["key"], string][]).map(([k, label]) => <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: key === k }} onPress={() => { setKey(k); setValue(""); }} style={{ minHeight: 44, justifyContent: "center" }}><Body>{key === k ? "● " : "○ "}{label}</Body></Pressable>)}
      {FACT_OPTIONS[key] ? FACT_OPTIONS[key]!.map(option => <SecondaryAction key={option} label={`${value === option ? "✓ " : ""}${displayValue(option)}`} onPress={() => setValue(option)} />) : <Field label="Datum (JJJJ-MM-TT)" value={value} onChangeText={setValue} />}
      {documents.map(d => <SecondaryAction key={d.id} label={`${docId === d.id ? "✓ " : ""}${d.file_name}`} onPress={() => setDocId(d.id)} />)}
      <Field label="Seite" keyboardType="number-pad" value={page} onChangeText={setPage} />
      <Field label="Wörtliche Belegstelle" multiline value={quote} onChangeText={setQuote} />
      <SecondaryAction label="Unbestätigte Angabe hinzufügen" disabled={!value.trim() || !quote.trim() || !docId || !Number.isInteger(Number(page)) || Number(page) < 1} onPress={() => {
        setFacts([...facts, { key, value: value.trim(), confirmed: false, evidence: { document_id: docId, page: Number(page), quote: quote.trim() } }]); setQuote(""); setValue(""); setEditing(false);
      }} />
    </View> : null}
    <PrimaryAction label={busy ? "Wird gespeichert …" : "Angaben und Bestätigungen speichern"} disabled={busy} onPress={() => void save()} />
    <Message>{message}</Message>
  </View>;
}
