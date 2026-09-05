import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useFall } from "@/features/faelle/hooks";
import { RECHTSGEBIET_TEXT, STATUS_TEXT } from "@/features/faelle/typen";
import { datum, dateigroesse } from "@/lib/format";
import {
  AppHeader,
  Body,
  Message,
  Muted,
  PaperScrollScreen,
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

  const { fall, dokumente, fakten, analyse, quellen } = daten;

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
          angeschlossen ist, sollte sie einen echten Titel vorschlagen; bis
          dahin zeigt die Kopfzeile den Satz und dieser Abschnitt entfällt.
          Die Schilderung bleibt unverändert gespeichert — das Domänenmodell
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
              <View key={dokument.id} style={styles.zeile}>
                <Text style={styles.zeileHaupt} numberOfLines={1}>
                  {dokument.file_name}
                </Text>
                <Text style={styles.zeileNeben}>{dateigroesse(dokument.byte_size)}</Text>
              </View>
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
        leer="Noch keine Analyse. Die Prüfung gegen Gesetze und Urteile ist noch nicht angeschlossen."
      >
        {analyse?.answer ? <Body>{analyse.answer}</Body> : undefined}
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
  zeileHaupt: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink },
  zeileNeben: { fontSize: 11, color: colors.inkSoft },
  marke: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.success,
  },

  fuss: { paddingTop: 22, alignItems: "center" },
});
