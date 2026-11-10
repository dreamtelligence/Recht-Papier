import { TerminationInput } from "@/features/faelle/TerminationInput";
import { useCallback, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { dokumentAdresse, dokumentErstellen, faktBestaetigen } from "@/features/faelle/api";
import { analyseLaeuft } from "@/features/faelle/analyse-status";
import { useFall } from "@/features/faelle/hooks";
import {
  DOKUMENT_TEXT,
  RECHTSGEBIET_TEXT,
  STATUS_TEXT,
  type GeneratedDocument,
} from "@/features/faelle/typen";
import { fallEinordnen } from "@/features/legal/client";
import { datum, dateigroesse } from "@/lib/format";
import {
  AppHeader,
  Body,
  Message,
  Muted,
  PaperScrollScreen,
  PrimaryAction,
  SecondaryAction,
  Section,
  Title,
  Waiting,
} from "@/ui";
import { colors } from "@/theme";

/**
 * Die Fallakte selbst.
 *
 * Sie zeigt ihre Struktur auch dort, wo sie noch leer ist: welche Abschnitte
 * es gibt, was in ihnen stehen wird und was heute fehlt. Das ist der Grund,
 * warum leere Abschnitte einen Satz tragen statt zu verschwinden — wer die
 * Akte aufschlägt, soll sehen, woraus sie besteht.
 *
 * Was hier nicht steht, steht bewusst nicht: keine Prozentangabe zu
 * Prozesschancen, keine rechtliche Aussage ohne Fundstelle. Beides sind
 * Invarianten aus `architecture:recht-und-papier-core`.
 */
export default function Fallakte() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fall: daten, fehler, laedt, aktualisiert, aktualisieren } = useFall(id);

  const [ordnetEin, setOrdnetEin] = useState(false);
  const [meldung, setMeldung] = useState("");
  // Welche Angabe gerade geschrieben wird. Nur diese eine Zeile wird stumm
  // geschaltet — ein globales `arbeitet` würde die ganze Liste sperren, weil
  // eine einzelne Bestätigung unterwegs ist.
  const [schreibtFakt, setSchreibtFakt] = useState<string | null>(null);
  // Welcher Dokumenttyp gerade erstellt wird — nicht nur *dass* einer läuft.
  // Sonst behaupten beide Knöpfe gleichzeitig, sie seien an der Arbeit.
  const [erstelltDokument, setErstelltDokument] = useState<GeneratedDocument["kind"] | null>(
    null,
  );

  const einordnen = useCallback(async () => {
    setOrdnetEin(true);
    setMeldung("");
    try {
      await fallEinordnen(id);
      aktualisieren();
    } catch (ausnahme) {
      setMeldung(
        ausnahme instanceof Error
          ? ausnahme.message
          : "Die Einordnung hat nicht geklappt. Bitte später erneut versuchen.",
      );
      // Auch der Fehlerfall lädt neu: die Edge Function hat den Status
      // inzwischen auf `fehlgeschlagen` gesetzt, und die Akte soll das zeigen
      // statt weiter "Entwurf" zu behaupten.
      aktualisieren();
    } finally {
      setOrdnetEin(false);
    }
  }, [aktualisieren, id]);

  /**
   * Eine Angabe bestätigen oder die Bestätigung zurücknehmen.
   *
   * Danach wird die Akte neu geladen, und zwar vollständig: die Bestätigung
   * zählt `input_revision` hoch, wodurch eine vorliegende Analyse veraltet.
   * Würde hier nur die eine Zeile umgeschaltet, stünde die Einordnung weiter
   * da, als gälte sie noch.
   */
  const bestaetigen = useCallback(
    async (faktId: string, bestaetigt: boolean) => {
      setSchreibtFakt(faktId);
      setMeldung("");
      try {
        await faktBestaetigen(faktId, bestaetigt);
        aktualisieren();
      } catch {
        setMeldung("Die Angabe ließ sich nicht ändern. Bitte erneut versuchen.");
      } finally {
        setSchreibtFakt(null);
      }
    },
    [aktualisieren],
  );

  const erstellen = useCallback(
    async (kind: GeneratedDocument["kind"]) => {
      setErstelltDokument(kind);
      setMeldung("");
      try {
        await dokumentErstellen(id, kind);
        aktualisieren();
      } catch (ausnahme) {
        setMeldung(
          ausnahme instanceof Error
            ? ausnahme.message
            : "Das Dokument lässt sich gerade nicht erstellen.",
        );
      } finally {
        setErstelltDokument(null);
      }
    },
    [aktualisieren, id],
  );

  const oeffnen = useCallback(async (storagePath: string) => {
    try {
      await Linking.openURL(await dokumentAdresse(storagePath));
    } catch {
      setMeldung("Das Dokument lässt sich gerade nicht öffnen.");
    }
  }, []);

  if (laedt) return <Waiting />;

  if (fehler || !daten) {
    return (
      <PaperScrollScreen>
        <AppHeader titel="Fallakte" />
        <Message>{fehler || "Diese Fallakte ist nicht verfügbar."}</Message>
        <SecondaryAction label="Zur Übersicht" onPress={() => router.replace("/")} />
      </PaperScrollScreen>
    );
  }

  const { fall, dokumente, fakten, analyse, quellen, fristen, schreiben } = daten;

  // Eine Analyse gilt nur für den Eingabestand, auf dem sie beruht. Wer danach
  // eine Angabe bestätigt oder ein Dokument nachreicht, hat eine andere Akte
  // als die geprüfte — und die Einordnung darunter ist ab da eine Aussage über
  // etwas, das es so nicht mehr gibt.
  const laufAbgelaufen = fall.status === "in_pruefung" && !analyseLaeuft(fall);
  const analyseVeraltet = Boolean(analyse) && analyse!.input_revision !== fall.input_revision;
  const bestaetigteAngaben = fall.termination_input?.facts.filter(f => f.confirmed).length ?? 0;

  // Einordnen lohnt sich, solange keine vorliegt, die letzte gescheitert ist
  // oder die Akte sich seither geändert hat. Während der Prüfung verhindert
  // der gesperrte Knopf doppelte Jobs.
  const kannEinordnen =
    !ordnetEin &&
    (fall.status === "entwurf" || fall.status === "fehlgeschlagen" || laufAbgelaufen || analyseVeraltet);

  // Ein Dokument darf nur aus einer bestandenen, aktuellen Prüfung entstehen —
  // und nur, wenn überhaupt etwas bestätigt ist. Die Datenbank erzwingt
  // dasselbe noch einmal; hier steht es, damit der Knopf nicht in einen Fehler
  // führt, den man vorher sehen konnte.
  const kannDokument =
    !erstelltDokument && Boolean(analyse?.released && analyse.structured_result) && !analyseVeraltet && bestaetigteAngaben > 0;
  const dokumentGrund = !analyse
    ? "Dafür muss der Fall zuerst rechtlich eingeordnet werden."
    : !analyse.released
      ? "Die letzte Einordnung hat die technischen Prüfungen nicht bestanden."
      : analyseVeraltet
        ? "Die Akte hat sich seit der Einordnung geändert. Bitte erneut einordnen."
        : bestaetigteAngaben === 0
          ? "Bitte zuerst mindestens eine Angabe bestätigen und danach erneut einordnen."
          : "";

  return (
    <PaperScrollScreen
      refreshControl={
        <RefreshControl
          refreshing={aktualisiert}
          onRefresh={aktualisieren}
          tintColor={colors.accent}
        />
      }
    >
      <AppHeader titel="Fallakte" />

      <View style={styles.kopf}>
        <Title>{fall.title}</Title>
        <Text style={styles.meta}>
          {laufAbgelaufen ? "Prüfung unterbrochen" : STATUS_TEXT[fall.status] ?? fall.status}
          {fall.legal_area ? ` · ${RECHTSGEBIET_TEXT[fall.legal_area] ?? fall.legal_area}` : ""}
          {` · angelegt am ${datum(fall.created_at)}`}
        </Text>
      </View>

      {/* Der Titel wird beim Anlegen aus den ersten 80 Zeichen der Schilderung
          abgeleitet. Bei kurzen Schilderungen ist er mit ihr identisch, und
          dann stünde derselbe Satz zweimal untereinander. Sobald die Analyse
          einen echten Titel vorschlägt, entfällt dieser Abschnitt. Die
          Schilderung bleibt unverändert gespeichert — das Domänenmodell
          verbietet ausdrücklich, sie durch generierten Text zu ersetzen. */}
      {fall.description.trim() !== fall.title.trim() ? (
        <Section titel="Sachverhalt">
          <Body>{fall.description}</Body>
        </Section>
      ) : null}

      <Section
        titel={`Dokumente${dokumente.length ? ` · ${dokumente.length}` : ""}`}
        leer="Noch keine Dokumente hinterlegt."
      >
        {dokumente.length ? (
          <View style={styles.liste}>
            {dokumente.map((dokument) => (
              <Pressable
                key={dokument.id}
                accessibilityRole="button"
                accessibilityLabel={`${dokument.file_name} öffnen`}
                onPress={() => oeffnen(dokument.storage_path)}
                style={({ pressed }) => [styles.zeile, pressed && styles.gedrueckt]}
              >
                <View style={styles.zeileText}>
                  <Text style={styles.zeileHaupt} numberOfLines={1}>
                    {dokument.file_name}
                  </Text>
                  {/* Ein Scan ohne Textebene ist kein Fehler des Nutzers, aber
                      er erklärt, warum die Einordnung das Schreiben nicht
                      kennt. Ungesagt bliebe das ein Rätsel. */}
                  {dokument.processed_at && dokument.processing_error ? (
                    <Text style={styles.hinweis}>Text nicht lesbar</Text>
                  ) : null}
                </View>
                <Text style={styles.zeileNeben}>{dateigroesse(dokument.byte_size)}</Text>
              </Pressable>
            ))}
          </View>
        ) : undefined}
      </Section>

      <Section titel="Berechnungsrelevante Angaben">
        <TerminationInput key={`${fall.input_revision}-${dokumente.map(d => d.processed_at).join()}`} caseId={id} input={fall.termination_input} documents={dokumente} onSaved={aktualisieren} />
      </Section>

      <Section
        titel="Ergänzende Freitextangaben"
      >
        {!fakten.length ? (
          <Muted>
            Keine ergänzenden Freitextangaben. Berechnungsrelevante Angaben und Belegstellen stehen im Abschnitt darüber.
          </Muted>
        ) : null}
        {fakten.length ? (
          <View style={styles.liste}>
            {/* Antippen bestätigt und nimmt zurück. Bewusst kein Schalter:
                die Bestätigung ist eine Aussage über den eigenen Fall, keine
                Einstellung — und sie muss umkehrbar bleiben, solange sie noch
                in keinem freigegebenen Schreiben steht. */}
            {fakten.map((fakt) => (
              <Pressable
                key={fakt.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: fakt.confirmed, disabled: schreibtFakt === fakt.id }}
                accessibilityLabel={
                  fakt.confirmed
                    ? `Bestätigung zurücknehmen: ${fakt.statement}`
                    : `Angabe bestätigen: ${fakt.statement}`
                }
                disabled={schreibtFakt === fakt.id}
                onPress={() => bestaetigen(fakt.id, !fakt.confirmed)}
                style={({ pressed }) => [
                  styles.zeile,
                  (pressed || schreibtFakt === fakt.id) && styles.gedrueckt,
                ]}
              >
                <View style={styles.zeileText}>
                  <Text style={styles.zeileHaupt}>{fakt.statement}</Text>
                  {fakt.occurred_on ? (
                    <Text style={styles.hinweis}>{datum(fakt.occurred_on)}</Text>
                  ) : null}
                </View>
                <Text style={fakt.confirmed ? styles.marke : styles.markeOffen}>
                  {fakt.confirmed ? "bestätigt" : "bestätigen"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : undefined}
        {fakten.length ? (
          <Text style={styles.abschnittHinweis}>
            Nur bestätigte Angaben tragen ein Schreiben. Jede Änderung hier macht eine
            vorliegende Einordnung ungültig — der Fall muss danach erneut eingeordnet werden.
          </Text>
        ) : null}
      </Section>

      <Section
        titel="Strukturierte Prüfung"
        leer={
          fall.status === "in_pruefung"
            ? "Die Prüfung läuft im Hintergrund. Beim ersten Mal kann sie mehrere Minuten dauern. Sie können diese Ansicht verlassen und später zurückkehren."
            : "Noch keine Analyse. Die Prüfung vergleicht Ihren Sachverhalt mit Gesetzen und Urteilen."
        }
      >
        {analyse?.answer ? (
          <View style={styles.liste}>
            {/* Eine Prüfung, die nicht bestanden hat, darf nicht aussehen wie
                eine, die bestanden hat. Der Text bleibt trotzdem stehen — er
                ist die Begründung dafür, warum hier nichts weitergeht. */}
            {!analyse.released ? (
              <Text style={styles.warnung}>
                Diese Einordnung hat die technischen Prüfungen nicht bestanden. Sie trägt kein
                Schreiben.
              </Text>
            ) : null}
            {analyseVeraltet ? (
              <Text style={styles.warnung}>
                Die Akte hat sich seit dieser Einordnung geändert. Bitte erneut einordnen.
              </Text>
            ) : null}
            {analyse.structured_result ? <View style={{ gap: 14 }}>
              <Muted>Technische Prüfungen bestanden. Keine anwaltliche Prüfung.</Muted>
              {analyse.structured_result.calculations.map(c => <View key={c.kind} style={{ gap: 5 }}><Body>{c.kind === "notice_end" ? "Gesetzlicher Vergleichstermin" : "Klagefrist im unterstützten Grundfall"}: {c.due_on}</Body><Muted>{c.method}</Muted><Muted>{c.assumptions.join(" ")}</Muted></View>)}
              {analyse.structured_result.checks.map(c => <Body key={c.code}>{c.statement}</Body>)}
              {analyse.structured_result.uncertainties.map(u => <Body key={u}>Offen: {u}</Body>)}
            </View> : <Body>{analyse.answer}</Body>}
          </View>
        ) : undefined}
      </Section>

      {kannEinordnen || ordnetEin ? (
        <View style={styles.aktion}>
          <PrimaryAction
            label={
              ordnetEin
                ? "Wird geprüft …"
                : analyseVeraltet
                  ? "Erneut einordnen"
                  : "Strukturiert prüfen"
            }
            onPress={einordnen}
            disabled={!kannEinordnen}
          />
          <Muted>
            Die Prüfung läuft im Hintergrund und kann mehrere Minuten dauern. Ihr Sachverhalt wird dafür pseudonymisiert.
          </Muted>
        </View>
      ) : null}

      <Message>{meldung || fall.analysis_error || (laufAbgelaufen ? "Die Prüfung wurde unterbrochen. Bitte erneut starten." : "")}</Message>

      <Section
        titel={`Bericht und Schreiben${schreiben.length ? ` · ${schreiben.length}` : ""}`}
      >
        {!schreiben.length ? (
          <Muted>
            Noch keine Dokumente erstellt. Sie entstehen aus bestätigten Angaben und einer
            bestandenen Einordnung.
          </Muted>
        ) : null}
        {schreiben.length ? (
          <View style={styles.liste}>
            {schreiben.map((dokument) => {
              // Veraltet heißt: erzeugt aus einem Stand, den die Akte nicht
              // mehr hat. Freigeben lässt sich das nicht mehr, und das gehört
              // an die Zeile statt in einen Fehler beim Antippen.
              const veraltet = dokument.input_revision !== fall.input_revision;
              return (
                <Pressable
                  key={dokument.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${dokument.title} ansehen`}
                  onPress={() => router.push(`/schreiben/${dokument.id}`)}
                  style={({ pressed }) => [styles.zeile, pressed && styles.gedrueckt]}
                >
                  <View style={styles.zeileText}>
                    <Text style={styles.zeileHaupt}>{DOKUMENT_TEXT[dokument.kind]}</Text>
                    <Text style={styles.hinweis}>
                      {dokument.approved_at
                        ? `freigegeben am ${datum(dokument.approved_at)}`
                        : "Entwurf · noch nicht freigegeben"}
                      {veraltet ? " · veraltet" : ""}
                    </Text>
                  </View>
                  <Text style={styles.zeileNeben}>{datum(dokument.created_at)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : undefined}

        <View style={styles.dokumentAktion}>
          <SecondaryAction
            label={erstelltDokument === "bericht" ? "Wird erstellt …" : "Bericht erstellen"}
            onPress={() => erstellen("bericht")}
            disabled={!kannDokument}
          />

          {/* Wenn der Weg versperrt ist, steht hier warum — und nicht erst,
              nachdem jemand vergeblich getippt hat. */}
          {dokumentGrund ? <Muted>{dokumentGrund}</Muted> : null}
        </View>
      </Section>

      <Section
        titel="Fristen"
        leer="Nur aus bestätigten Angaben berechnete Termine erscheinen hier mit ihren Voraussetzungen."
      >
        {fristen.length ? (
          <View style={styles.liste}>
            {fristen.map((frist) => (
              <View key={frist.id} style={styles.frist}>
                <View style={{ gap: 5 }}>
                  <Text style={styles.fristDatum}>{datum(frist.due_on)}</Text>
                  <Text style={styles.zeileNeben}>{frist.basis}</Text>
                </View>
                <Text style={styles.fristText}>{frist.label}</Text>
                {/* Eine gerechnete Frist ist ein Hinweis, keine Zusage. Das
                    muss dranstehen, solange niemand sie bestätigt hat — sonst
                    verlässt sich jemand auf ein Datum, das ein Modell aus
                    einem Text gezogen hat. */}
                {!frist.confirmed ? (
                  <Text style={styles.hinweis}>aus bestätigten Angaben berechnet · keine anwaltliche Prüfung</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : undefined}
      </Section>

      <Section
        titel="Rechtsgrundlagen"
        leer="Noch keine Fundstellen. Jede rechtliche Aussage bekommt hier ihren Beleg mit Rechtsstand."
      >
        {quellen.length ? (
          <View style={styles.liste}>
            {quellen.map((quelle) => (
              <View key={quelle.id} style={styles.zeile}>
                <Text style={styles.zeileHaupt}>
                  {quelle.reference}
                  {quelle.locator ? ` ${quelle.locator}` : ""}
                  {quelle.title ? ` — ${quelle.title}` : ""}
                </Text>
                {quelle.valid_as_of ? (
                  <Text style={styles.zeileNeben}>Stand {quelle.valid_as_of}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : undefined}
      </Section>

      <View style={styles.fuss}>
        <Muted>Ersetzt keine Rechtsberatung.</Muted>
      </View>
    </PaperScrollScreen>
  );
}

const styles = StyleSheet.create({
  kopf: {
    paddingBottom: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
  meta: { fontSize: 12, lineHeight: 18, color: colors.inkSoft },

  liste: { gap: 10 },
  zeile: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  zeileText: { flex: 1, gap: 2 },
  zeileHaupt: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink },
  zeileNeben: { fontSize: 11, color: colors.inkSoft, flexShrink: 1 },
  gedrueckt: { opacity: 0.55 },
  hinweis: { fontSize: 11, color: colors.inkSoft, fontStyle: "italic" },
  marke: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.success,
  },
  // Der offene Zustand ist eine Einladung, kein Zustand — deshalb
  // unterstrichen wie ein leiser Weg und nicht gesetzt wie eine Marke.
  markeOffen: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.accentDark,
    textDecorationLine: "underline",
  },
  abschnittHinweis: {
    paddingTop: 12,
    fontSize: 11,
    lineHeight: 17,
    color: colors.inkSoft,
    fontStyle: "italic",
  },
  warnung: { fontSize: 12, lineHeight: 19, color: colors.inkSoft, fontStyle: "italic" },
  dokumentAktion: { paddingTop: 14, gap: 2 },

  aktion: { paddingTop: 18, gap: 10 },

  frist: { gap: 3 },
  fristDatum: { fontSize: 15, lineHeight: 22, color: colors.ink, fontWeight: "600" },
  fristText: { fontSize: 13, lineHeight: 20, color: colors.inkSoft },

  fuss: { paddingTop: 22, alignItems: "center" },
});
