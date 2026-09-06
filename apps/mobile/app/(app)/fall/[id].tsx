import { useCallback, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { dokumentAdresse } from "@/features/faelle/api";
import { useFall } from "@/features/faelle/hooks";
import { RECHTSGEBIET_TEXT, STATUS_TEXT } from "@/features/faelle/typen";
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

  const { fall, dokumente, fakten, analyse, quellen, fristen } = daten;
  // Einordnen lohnt sich, solange keine vorliegt oder die letzte gescheitert
  // ist. Während der Prüfung wäre der Knopf eine Einladung zum Doppeltippen —
  // und jeder Lauf ist ein kostenpflichtiger Modellaufruf.
  const kannEinordnen =
    !ordnetEin && (fall.status === "entwurf" || fall.status === "fehlgeschlagen");

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
          {STATUS_TEXT[fall.status] ?? fall.status}
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

      <Section
        titel="Bestätigte Angaben"
        leer="Noch keine Angaben bestätigt. Bestätigte Angaben sind die Grundlage für spätere Schreiben."
      >
        {fakten.length ? (
          <View style={styles.liste}>
            {fakten.map((fakt) => (
              <View key={fakt.id} style={styles.zeile}>
                <Text style={styles.zeileHaupt}>{fakt.statement}</Text>
                {fakt.confirmed ? <Text style={styles.marke}>bestätigt</Text> : null}
              </View>
            ))}
          </View>
        ) : undefined}
      </Section>

      <Section
        titel="Rechtliche Einordnung"
        leer={
          fall.status === "in_pruefung"
            ? "Die Prüfung läuft. Beim ersten Mal dauert es länger — die Rechtsdatenbank fährt erst hoch."
            : "Noch keine Analyse. Die Prüfung vergleicht Ihren Sachverhalt mit Gesetzen und Urteilen."
        }
      >
        {analyse?.answer ? <Body>{analyse.answer}</Body> : undefined}
      </Section>

      {kannEinordnen || ordnetEin ? (
        <View style={styles.aktion}>
          <PrimaryAction
            label={ordnetEin ? "Wird geprüft …" : "Rechtlich einordnen"}
            onPress={einordnen}
            disabled={!kannEinordnen}
          />
          <Muted>
            Dauert bis zu zwei Minuten. Ihr Sachverhalt wird dafür pseudonymisiert.
          </Muted>
        </View>
      ) : null}

      <Message>{meldung}</Message>

      <Section
        titel="Fristen"
        leer="Noch keine Fristen. Nennt die Einordnung eine, steht sie hier mit ihrer Rechtsgrundlage."
      >
        {fristen.length ? (
          <View style={styles.liste}>
            {fristen.map((frist) => (
              <View key={frist.id} style={styles.frist}>
                <View style={styles.zeile}>
                  <Text style={styles.fristDatum}>{datum(frist.due_on)}</Text>
                  <Text style={styles.zeileNeben}>{frist.basis}</Text>
                </View>
                <Text style={styles.fristText}>{frist.label}</Text>
                {/* Eine gerechnete Frist ist ein Hinweis, keine Zusage. Das
                    muss dranstehen, solange niemand sie bestätigt hat — sonst
                    verlässt sich jemand auf ein Datum, das ein Modell aus
                    einem Text gezogen hat. */}
                {!frist.confirmed ? (
                  <Text style={styles.hinweis}>ungeprüft · bitte selbst nachrechnen</Text>
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
  zeileNeben: { fontSize: 11, color: colors.inkSoft },
  gedrueckt: { opacity: 0.55 },
  hinweis: { fontSize: 11, color: colors.inkSoft, fontStyle: "italic" },
  marke: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.success,
  },

  aktion: { paddingTop: 18, gap: 10 },

  frist: { gap: 3 },
  fristDatum: { fontSize: 15, lineHeight: 22, color: colors.ink, fontWeight: "600" },
  fristText: { fontSize: 13, lineHeight: 20, color: colors.inkSoft },

  fuss: { paddingTop: 22, alignItems: "center" },
});
