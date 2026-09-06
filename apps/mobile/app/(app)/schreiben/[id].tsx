import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { dokumentFreigeben, loadSchreiben } from "@/features/faelle/api";
import { alsPdfTeilen } from "@/features/faelle/export";
import { DOKUMENT_TEXT, type GeneratedDocument } from "@/features/faelle/typen";
import { KEIN_NETZ, istNetzfehler } from "@/lib/fehler";
import { datum } from "@/lib/format";
import {
  AppHeader,
  Message,
  Muted,
  PaperScrollScreen,
  PrimaryAction,
  SecondaryAction,
  Waiting,
} from "@/ui";
import { colors } from "@/theme";

/**
 * Die Vorschau auf ein erzeugtes Dokument — und die Stelle, an der es
 * freigegeben wird.
 *
 * Der Text steht hier vollständig und unverändert, so wie er in der Datenbank
 * liegt. Das ist der ganze Zweck des Bildschirms: freigeben kann nur, wer
 * gelesen hat, und gelesen werden kann nur, was auch so exportiert wird.
 * Deshalb kürzt diese Ansicht nichts, fasst nichts zusammen und formatiert den
 * Text nicht um.
 *
 * Die Reihenfolge ist bindend: erst lesen, dann freigeben, dann exportieren.
 * Der Exportknopf erscheint nicht vor der Freigabe — und `alsPdfTeilen` prüft
 * das noch einmal selbst, weil eine Datei, die einmal aus der App heraus ist,
 * nicht zurückgeholt werden kann.
 */
export default function SchreibenVorschau() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [dokument, setDokument] = useState<GeneratedDocument | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [arbeitet, setArbeitet] = useState(false);
  const [meldung, setMeldung] = useState("");

  const laden = useCallback(async () => {
    try {
      setDokument(await loadSchreiben(id));
      setMeldung("");
    } catch (ausnahme) {
      setMeldung(istNetzfehler(ausnahme) ? KEIN_NETZ : "Dieses Dokument ist nicht verfügbar.");
    } finally {
      setLaedt(false);
    }
  }, [id]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const freigeben = useCallback(async () => {
    setArbeitet(true);
    setMeldung("");
    try {
      await dokumentFreigeben(id);
      await laden();
    } catch (ausnahme) {
      setMeldung(
        ausnahme instanceof Error ? ausnahme.message : "Die Freigabe hat nicht geklappt.",
      );
    } finally {
      setArbeitet(false);
    }
  }, [id, laden]);

  const exportieren = useCallback(async () => {
    if (!dokument) return;
    setArbeitet(true);
    setMeldung("");
    try {
      await alsPdfTeilen(dokument);
    } catch (ausnahme) {
      setMeldung(
        ausnahme instanceof Error ? ausnahme.message : "Der Export hat nicht geklappt.",
      );
    } finally {
      setArbeitet(false);
    }
  }, [dokument]);

  if (laedt) return <Waiting />;

  if (!dokument) {
    return (
      <PaperScrollScreen>
        <AppHeader titel="Dokument" />
        <Message>{meldung || "Dieses Dokument ist nicht verfügbar."}</Message>
        <SecondaryAction label="Zurück" onPress={() => router.back()} />
      </PaperScrollScreen>
    );
  }

  return (
    <PaperScrollScreen>
      <AppHeader titel={DOKUMENT_TEXT[dokument.kind] ?? "Dokument"} />

      <View style={styles.kopf}>
        <Text style={styles.meta}>
          {dokument.approved_at
            ? `Freigegeben am ${datum(dokument.approved_at)}`
            : "Entwurf · noch nicht freigegeben"}
          {` · erstellt am ${datum(dokument.created_at)}`}
        </Text>
      </View>

      {/* Nicht-editierbar und in voller Länge. Ein bearbeitbares Feld hier
          würde den Text von der Analyse lösen, aus der er stammt — und die
          Freigabe damit auf etwas beziehen, das die Prüfung nie gesehen hat. */}
      <Text style={styles.text} selectable>
        {dokument.body}
      </Text>

      <View style={styles.aktion}>
        {dokument.approved_at ? (
          <>
            <PrimaryAction
              label={arbeitet ? "Wird vorbereitet …" : "Als PDF weitergeben"}
              onPress={exportieren}
              disabled={arbeitet}
            />
            <Muted>
              Die Datei enthält genau diesen Text. Ersetzt keine Rechtsberatung.
            </Muted>
          </>
        ) : (
          <>
            <PrimaryAction
              label={arbeitet ? "Wird freigegeben …" : "Text freigeben"}
              onPress={freigeben}
              disabled={arbeitet}
            />
            <Muted>
              Mit der Freigabe bestätigen Sie den Text in dieser Fassung. Erst danach
              lässt er sich als PDF weitergeben.
            </Muted>
          </>
        )}
      </View>

      <Message>{meldung}</Message>

      <View style={styles.fuss}>
        <SecondaryAction label="Zurück zur Fallakte" onPress={() => router.back()} />
      </View>
    </PaperScrollScreen>
  );
}

const styles = StyleSheet.create({
  kopf: {
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  meta: { fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  text: { paddingTop: 20, fontSize: 14, lineHeight: 23, color: colors.ink },
  aktion: { paddingTop: 24, gap: 10 },
  fuss: { paddingTop: 20 },
});
