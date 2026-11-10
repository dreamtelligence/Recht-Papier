import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { useNutzerId } from "@/features/auth/session";
import { createCase, MAX_DOKUMENT_BYTES } from "@/features/faelle/api";
import {
  Message,
  Muted,
  PaperScrollScreen,
  PrimaryAction,
  TextArea,
  Title,
} from "@/ui";
import { colors, radius } from "@/theme";

const ERLAUBTE_TYPEN = [
  "application/pdf",
];

/**
 * Der erste Schritt einer Fallakte: Schilderung und Anschreiben zusammen.
 *
 * Der Upload steht bewusst direkt neben dem Textfeld und nicht in einem
 * späteren Schritt: er macht sichtbar, welche Unterlage gebraucht wird, statt
 * den irreführenden Eindruck zu erzeugen, Dokumente ließen sich "auch später"
 * ergänzen. "Fall anlegen" wird erst mit beidem aktiv (Entscheidung
 * `b6d7fd95`).
 */
export default function NeuerFall() {
  const router = useRouter();
  const nutzerId = useNutzerId();

  const [schilderung, setSchilderung] = useState("");
  const [anlage, setAnlage] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [meldung, setMeldung] = useState("");

  const kannAnlegen = schilderung.trim().length >= 8 && anlage !== null && !beschaeftigt;

  const dokumentWaehlen = useCallback(async () => {
    let ergebnis: DocumentPicker.DocumentPickerResult;
    try {
      ergebnis = await DocumentPicker.getDocumentAsync({
        type: ERLAUBTE_TYPEN,
        copyToCacheDirectory: true,
      });
    } catch {
      // Der Picker wirft, wenn eine iCloud-Datei nicht verfügbar ist oder der
      // Anbieter abbricht. Ohne diesen Zweig war das eine unbehandelte
      // Rejection: der Nutzer tippt, nichts passiert, nichts erklärt es.
      setMeldung("Die Datei ließ sich nicht öffnen. Bitte erneut versuchen.");
      return;
    }
    if (ergebnis.canceled) return;

    const datei = ergebnis.assets[0];
    if (!datei) return;
    if (datei.size && datei.size > MAX_DOKUMENT_BYTES) {
      setMeldung("Das Dokument darf höchstens 20 MB groß sein.");
      return;
    }
    setMeldung("");
    setAnlage(datei);
  }, []);

  const anlegen = useCallback(async () => {
    if (!kannAnlegen || !anlage) return;
    setBeschaeftigt(true);
    setMeldung("");
    try {
      const angelegt = await createCase(nutzerId, schilderung, anlage);
      // Erst das Modal schließen, dann die Akte öffnen. Ein `replace` würde die
      // Akte in der Modal-Präsentation stehen lassen — sie gehört aber in den
      // normalen Stapel, mit Zurück zur Übersicht.
      router.back();
      router.push(`/fall/${angelegt.id}`);
    } catch {
      setMeldung("Der Fall konnte nicht sicher gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setBeschaeftigt(false);
    }
  }, [anlage, kannAnlegen, nutzerId, router, schilderung]);

  return (
    <PaperScrollScreen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Schließen"
        hitSlop={14}
        onPress={() => router.back()}
        style={styles.schliessen}
      >
        <Text style={styles.schliessenZeichen}>×</Text>
      </Pressable>

      <Title>Worum geht es?</Title>
      <Muted>Portfolio-Version: Beschreiben Sie eine fiktive ordentliche Arbeitgeberkündigung und fügen Sie ein PDF mit Textebene hinzu.</Muted>

      <View style={styles.formular}>
        <TextArea
          label="Was ist passiert?"
          value={schilderung}
          onChangeText={setSchilderung}
          placeholder="Zum Beispiel: Ich habe gestern eine Kündigung erhalten …"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={anlage ? `Anschreiben: ${anlage.name}` : "Anschreiben hinzufügen"}
          onPress={dokumentWaehlen}
          style={({ pressed }) => [styles.anlage, pressed && styles.gedrueckt]}
        >
          <Text style={styles.anlageLabel} numberOfLines={1}>
            {anlage?.name ?? "Anschreiben hinzufügen"}
          </Text>
        </Pressable>
        <Muted>PDF mit Textebene · maximal 20 MB. Scans, Bilder und Word-Dateien werden noch nicht ausgewertet; OCR folgt als mögliche Erweiterung.</Muted>

        <PrimaryAction
          label={beschaeftigt ? "Wird gespeichert …" : "Fall anlegen"}
          onPress={anlegen}
          disabled={!kannAnlegen}
        />

        <Message>{meldung}</Message>
      </View>
    </PaperScrollScreen>
  );
}

const styles = StyleSheet.create({
  schliessen: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  schliessenZeichen: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.inkSoft,
    includeFontPadding: false,
  },
  formular: { marginTop: 18, gap: 12 },
  anlage: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "rgba(52, 73, 79, 0.28)",
    backgroundColor: "rgba(255, 253, 247, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  anlageLabel: { fontSize: 13, fontWeight: "600", color: colors.accentDark },
  gedrueckt: { transform: [{ translateY: 1 }] },
});
