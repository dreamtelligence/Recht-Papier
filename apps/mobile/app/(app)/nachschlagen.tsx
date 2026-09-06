import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { rechtNachschlagen, type RechtAntwort } from "@/features/legal/client";
import {
  AppHeader,
  Body,
  Label,
  Message,
  Muted,
  PaperScrollScreen,
  PrimaryAction,
  Section,
  TextArea,
} from "@/ui";
import { colors, fonts, radius } from "@/theme";

/**
 * Recht nachschlagen — Gesetze und Urteile fragen, ohne einen Fall anzulegen.
 *
 * Das ist ausdrücklich **keine** Fallberatung. Hier wird allgemeines Recht
 * beantwortet, so wie ein Kommentar es beantwortet: mit Fundstelle und
 * Rechtsstand. Wer seinen eigenen Sachverhalt schildern will, legt einen Fall
 * an — dort wird der Text pseudonymisiert und in die Akte geschrieben.
 *
 * Die Trennung ist keine Formalie. Eine individuelle rechtliche Einschätzung
 * ist reguliert, eine belegte Auskunft über die Rechtslage ist es nicht. Der
 * Bildschirm sagt das auch, statt es nur zu meinen.
 */
export default function Nachschlagen() {
  const [frage, setFrage] = useState("");
  const [antwort, setAntwort] = useState<RechtAntwort | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  const kannFragen = frage.trim().length >= 5 && !laeuft;

  const fragen = useCallback(async () => {
    if (!kannFragen) return;
    setLaeuft(true);
    setFehler("");
    setAntwort(null);
    try {
      setAntwort(await rechtNachschlagen(frage));
    } catch {
      setFehler("Das Nachschlagen hat nicht geklappt. Bitte später erneut versuchen.");
    } finally {
      setLaeuft(false);
    }
  }, [frage, kannFragen]);

  return (
    <PaperScrollScreen>
      <AppHeader titel="Nachschlagen" />

      <TextArea
        label="Ihre Rechtsfrage"
        value={frage}
        onChangeText={setFrage}
        placeholder="Zum Beispiel: Wie lang ist die Kündigungsfrist nach zehn Jahren im Betrieb?"
        hinweis="Allgemeine Rechtslage, kein eigener Fall. Für Ihren Fall legen Sie eine Fallakte an."
      />

      <View style={styles.aktion}>
        <PrimaryAction
          label={laeuft ? "Wird geprüft …" : "Nachschlagen"}
          onPress={fragen}
          disabled={!kannFragen}
        />
      </View>

      <Message>{fehler}</Message>

      {laeuft ? (
        <View style={styles.warten}>
          <ActivityIndicator color={colors.accent} />
          <Muted>
            Beim ersten Mal dauert es länger — die Rechtsdatenbank fährt erst hoch.
          </Muted>
        </View>
      ) : null}

      {antwort ? <Ergebnis antwort={antwort} /> : null}
    </PaperScrollScreen>
  );
}

function Ergebnis({ antwort }: { antwort: RechtAntwort }) {
  // Die Invariante aus `architecture:recht-und-papier-core`: rechtliche
  // Aussagen nur aus dem geprüften Quellenbestand. Beanstandet der Audit die
  // Antwort, wird das gezeigt statt verschwiegen — eine unbelegte Aussage
  // darf nicht aussehen wie eine belegte.
  const beanstandet = antwort.audit.high_severity_count > 0;

  return (
    <>
      {beanstandet ? (
        <View style={styles.warnung}>
          <Text style={styles.warnungText}>
            Diese Antwort enthält Aussagen ohne Fundstelle. Bitte nur als Hinweis lesen,
            nicht als geprüfte Auskunft.
          </Text>
        </View>
      ) : null}

      <Section titel="Antwort">
        <Body>{antwort.answer}</Body>
      </Section>

      <Section
        titel={`Rechtsgrundlagen${antwort.citations.length ? ` · ${antwort.citations.length}` : ""}`}
        leer="Keine Fundstellen — dann trägt die Antwort auch nichts."
      >
        {antwort.citations.length ? (
          <View style={styles.liste}>
            {antwort.citations.map((beleg) => (
              <Pressable
                key={beleg.id}
                accessibilityRole={beleg.url ? "link" : "text"}
                disabled={!beleg.url}
                onPress={() => beleg.url && Linking.openURL(beleg.url)}
                style={({ pressed }) => [styles.beleg, pressed && styles.gedrueckt]}
              >
                <Text style={styles.belegKopf}>
                  {beleg.id} {beleg.paragraph} {beleg.gesetz}
                </Text>
                {beleg.titel ? <Text style={styles.belegTitel}>{beleg.titel}</Text> : null}
                {beleg.stand ? (
                  <Text style={styles.belegStand}>Rechtsstand {beleg.stand}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : undefined}
      </Section>

      {/* Wer antwortet, gehört sichtbar gemacht — Apple verlangt die
          Offenlegung des KI-Einsatzes, und der Nutzer soll wissen, dass er
          keine Kanzlei gelesen hat. */}
      <View style={styles.fuss}>
        <Label>Erzeugt</Label>
        <Muted>
          {antwort.model ? `Modell ${antwort.model}` : "Modell unbekannt"}
          {antwort.rechtsgebiet ? ` · erkanntes Rechtsgebiet ${antwort.rechtsgebiet}` : ""}
        </Muted>
        <Muted>Ersetzt keine Rechtsberatung.</Muted>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  aktion: { marginTop: 16 },
  warten: { marginTop: 22, alignItems: "center", gap: 12 },

  warnung: {
    marginTop: 20,
    padding: 13,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "rgba(120, 74, 46, 0.35)",
    backgroundColor: "rgba(238, 226, 208, 0.7)",
  },
  warnungText: { fontSize: 13, lineHeight: 19, color: "#6b4a2c" },

  liste: { gap: 14 },
  beleg: { gap: 3 },
  belegKopf: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
    includeFontPadding: false,
  },
  belegTitel: { fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  belegStand: { fontSize: 11, color: colors.inkSoft },
  gedrueckt: { opacity: 0.55 },

  fuss: { paddingTop: 22, gap: 6 },
});
