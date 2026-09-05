import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { abmelden, kontoLoeschen } from "@/features/auth/api";
import { useSession } from "@/features/auth/session";
import {
  AppHeader,
  DangerAction,
  Label,
  Message,
  Muted,
  PaperScrollScreen,
  Rule,
  SecondaryAction,
  Title,
} from "@/ui";
import { datum } from "@/lib/format";

/**
 * Das Konto — und der Weg hinaus.
 *
 * Abmelden und Löschen standen vorher als kleine Links unter der Primäraktion
 * des Startbildschirms. Das war der sichtbarste Beleg dafür, dass Start und
 * App vermischt waren: eine Startseite hat keinen Abmeldeknopf, weil dort
 * niemand angemeldet ist.
 *
 * Die Löschung ist bewusst nicht versteckt: Apple verlangt, dass sie in der
 * App auffindbar ist, nicht erst auf Nachfrage beim Support
 * (Guideline 5.1.1(v)).
 */
export default function Konto() {
  const { session } = useSession();
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [meldung, setMeldung] = useState("");

  const loeschen = useCallback(async () => {
    setBeschaeftigt(true);
    setMeldung("");
    try {
      await kontoLoeschen();
      // Kein Navigieren von Hand: die Sitzung ist weg, der Guard in
      // app/_layout.tsx nimmt die ganze App-Gruppe aus dem Navigator.
    } catch {
      setMeldung("Das Konto konnte nicht gelöscht werden. Bitte später erneut versuchen.");
    } finally {
      setBeschaeftigt(false);
    }
  }, []);

  const loeschenBestaetigen = useCallback(() => {
    Alert.alert(
      "Konto und Fallakte löschen?",
      "Ihre Fallakte, alle hochgeladenen Dokumente und Ihr Konto werden dauerhaft gelöscht. "
        + "Das lässt sich nicht rückgängig machen.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Endgültig löschen", style: "destructive", onPress: loeschen },
      ],
    );
  }, [loeschen]);

  return (
    <PaperScrollScreen>
      <AppHeader titel="Konto" />

      <Title>Ihr Zugang</Title>

      <View style={styles.block}>
        <Label>Angemeldet als</Label>
        <Muted>{session?.user.email ?? "unbekannt"}</Muted>
        {session?.user.created_at ? (
          <Muted>Konto angelegt am {datum(session.user.created_at)}</Muted>
        ) : null}
      </View>

      <Rule />

      <View style={styles.block}>
        <SecondaryAction label="Abmelden" onPress={abmelden} disabled={beschaeftigt} />
      </View>

      <Rule />

      <View style={styles.block}>
        <Label>Konto löschen</Label>
        <Muted>
          Löscht Konto, Fallakte und alle hochgeladenen Dokumente vollständig und dauerhaft.
        </Muted>
        <DangerAction
          label="Konto und Fallakte löschen"
          onPress={loeschenBestaetigen}
          disabled={beschaeftigt}
        />
      </View>

      <Message>{meldung}</Message>

      <View style={styles.fuss}>
        <Muted>
          Fallakte in Deutschland gespeichert · Ersetzt keine Rechtsberatung.
        </Muted>
      </View>
    </PaperScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: 20, gap: 8 },
  fuss: { marginTop: "auto", paddingTop: 28 },
});
