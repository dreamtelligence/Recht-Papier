import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useNutzerId } from "@/features/auth/session";
import { useFaelle } from "@/features/faelle/hooks";
import type { CaseSummary } from "@/features/faelle/typen";
import {
  Brand,
  Headline,
  KontoKnopf,
  Lineatur,
  MehrKnopf,
  Message,
  Muted,
  PaperScreen,
  PrimaryAction,
  SecondaryAction,
  Waiting,
  ZEILE,
} from "@/ui";
import { colors, fonts } from "@/theme";

/**
 * Der erste Bildschirm nach der Anmeldung: die Fallakten dieses Kontos.
 *
 * Die Seite ist ein Notizblock: Die Lineatur läuft durch, und jeder Fall
 * belegt genau eine Zeile darauf. Deshalb ist die Zeilenhöhe hier keine freie
 * Zahl, sondern `ZEILE` — dieselbe, mit der die leeren Linien darunter
 * gezeichnet werden. Nur so gibt es keinen Bruch an der Stelle, wo das
 * Geschriebene aufhört.
 *
 * Was eine Zeile zeigt, ist deshalb auch nur der Titel. Status und Datum
 * stehen in der Akte selbst; in der Übersicht wären sie eine zweite Zeile pro
 * Eintrag, die das Raster sprengt und beim Überfliegen nichts beantwortet.
 */
export default function Fallübersicht() {
  const router = useRouter();
  const nutzerId = useNutzerId();
  const { faelle, fehler, laedt, aktualisiert, aktualisieren, entfernen } = useFaelle(nutzerId);

  // Zwei Messungen, aus denen die leeren Zeilen entstehen: wie hoch die Liste
  // sein darf und wie hoch sie wirklich ist. Was übrig bleibt, ist die freie
  // Seite. Die Linien rutschen also nicht weg, wenn ein Fall dazukommt — der
  // Fall belegt eine Zeile, und die leeren beginnen eine Zeile später.
  const [flaeche, setFlaeche] = useState(0);
  const [geschrieben, setGeschrieben] = useState(0);
  const frei = flaeche - geschrieben;

  const [meldung, setMeldung] = useState("");

  const bestaetigen = useCallback(
    (fall: CaseSummary) => {
      // Eine Fallakte enthält den Sachverhalt eines Menschen und seine
      // hochgeladenen Dokumente. Zwischen Menüpunkt und Löschung gehört eine
      // Rückfrage — die Handlung ist nicht umkehrbar.
      Alert.alert(
        "Fallakte löschen?",
        `„${fall.title}" wird mit allen Dokumenten dauerhaft gelöscht.`,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Löschen",
            style: "destructive",
            onPress: async () => {
              try {
                await entfernen(fall.id);
                setMeldung("");
              } catch {
                setMeldung("Die Fallakte konnte nicht gelöscht werden.");
              }
            },
          },
        ],
      );
    },
    [entfernen],
  );

  /**
   * Das Menü einer Zeile.
   *
   * Es steht hier genau ein Eintrag, weil es genau eine Handlung gibt, die
   * heute etwas tut. „Öffnen" wäre der Tap auf die Zeile noch einmal, und
   * Teilen, Drucken oder Bearbeiten hätten keinen Gegenstand: Es gibt noch
   * kein Schreiben, das man teilen könnte. Ein Menü, das Wege anbietet, die
   * ins Leere führen, ist schlechter als eines mit einem Eintrag.
   *
   * Das ist zugleich die Stelle, an der diese Wege entstehen, sobald es sie
   * gibt.
   */
  const menue = useCallback(
    (fall: CaseSummary) => {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: fall.title,
            options: ["Abbrechen", "Fallakte löschen"],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 1,
          },
          (gewaehlt) => {
            if (gewaehlt === 1) bestaetigen(fall);
          },
        );
        return;
      }

      // Android kennt kein Action Sheet im System. Der Dialog ist dort das
      // native Gegenstück, nicht ein Notbehelf.
      Alert.alert(fall.title, undefined, [
        { text: "Abbrechen", style: "cancel" },
        { text: "Fallakte löschen", style: "destructive", onPress: () => bestaetigen(fall) },
      ]);
    },
    [bestaetigen],
  );

  if (laedt) return <Waiting />;

  return (
    <PaperScreen>
      <View style={styles.kopf}>
        <Brand claim="" stift />
        <KontoKnopf onPress={() => router.push("/konto")} />
      </View>

      <View
        style={styles.seite}
        onLayout={(ereignis) => setFlaeche(ereignis.nativeEvent.layout.height)}
      >
        <Lineatur versatz={geschrieben} hoehe={frei} />

        <FlatList
          data={faelle}
          keyExtractor={(fall) => fall.id}
          renderItem={({ item }) => (
            <FallZeile
              fall={item}
              onPress={() => router.push(`/fall/${item.id}`)}
              onMehr={() => menue(item)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listenKopf}>
              <Headline>Fallakten</Headline>
              {/* Die Zahl steht unter der Überschrift, nicht in ihr. Neben
                  „Fallakten" gesetzt las sich das „· 1" wie ein zweites Wort;
                  darunter und leiser ist es erkennbar das, was es ist — wie
                  viele es sind. */}
              {faelle.length ? (
                <Muted>
                  {faelle.length} {faelle.length === 1 ? "Akte" : "Akten"}
                </Muted>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            fehler ? (
              <Message>{fehler}</Message>
            ) : (
              <Muted>
                Noch keine Fallakte. Schildern Sie, was passiert ist, und legen Sie Ihr
                Anschreiben dazu.
              </Muted>
            )
          }
          showsVerticalScrollIndicator={false}
          // Die geschriebene Höhe der Seite. Sie ändert sich beim Anlegen, beim
          // Löschen, beim Drehen und bei größerer Systemschrift — die leeren
          // Zeilen rücken dann mit, statt einmal beim Aufbau zu raten.
          onContentSizeChange={(_breite, hoehe) => setGeschrieben(hoehe)}
          refreshControl={
            <RefreshControl
              refreshing={aktualisiert}
              onRefresh={aktualisieren}
              tintColor={colors.accent}
            />
          }
        />
      </View>

      <View style={styles.fuss}>
        <Message>{meldung}</Message>
        <PrimaryAction
          label={faelle.length ? "Weiteren Fall beginnen" : "Fall beginnen"}
          onPress={() => router.push("/fall/neu")}
        />
        {/* Bewusst leise und unter der Primäraktion: Nachschlagen ist der
            kleinere Weg. Wer ein Problem hat, legt einen Fall an; wer nur
            wissen will, wie die Rechtslage ist, fragt hier. */}
        <SecondaryAction
          label="Recht nachschlagen"
          onPress={() => router.push("/nachschlagen")}
        />
      </View>
    </PaperScreen>
  );
}

/**
 * Ein Fall auf einer Zeile: Titel links, Menü rechts.
 *
 * Vorher lag hier eine Wischgeste. Sie ist raus, und zwar nicht nur, weil sie
 * hakte: Wischen ist eine Handlung, die man findet, indem man sie kennt. Auf
 * einer Seite, deren ganzer Zweck es ist, Verständlichkeit zu versprechen, ist
 * ein sichtbares Menü die ehrlichere Wahl.
 */
function FallZeile({
  fall,
  onPress,
  onMehr,
}: {
  fall: CaseSummary;
  onPress: () => void;
  onMehr: () => void;
}) {
  return (
    <View style={styles.zeile}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fallakte öffnen: ${fall.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.titelflaeche, pressed && styles.gedrueckt]}
      >
        <Text style={styles.zeileTitel} numberOfLines={1}>
          {fall.title}
        </Text>
      </Pressable>
      {/* Die Punkte sitzen auf der optischen Mitte des Titels, nicht auf der
          Linie. Bündig mit der Grundlinie gesetzt sähen sie aus wie ein
          Satzzeichen am Ende des Titels. */}
      <View style={styles.menueflaeche}>
        <MehrKnopf onPress={onMehr} label={`Mehr zu: ${fall.title}`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  // Die Seite, auf der die Fälle stehen. Sie nimmt den ganzen Platz zwischen
  // Kopf und Primäraktion — nur so weiß die Lineatur, wo sie aufhört.
  seite: { flex: 1 },

  // Die Überschrift der Seite, mittig und in der größten Schrift, die dieser
  // Bildschirm kennt.
  listenKopf: { alignItems: "center", gap: 4, marginBottom: 26 },

  // Genau eine Zeile des Rasters — inklusive ihrer Linie.
  zeile: {
    height: ZEILE,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineSoft,
  },
  // Der Text sitzt unten auf, wie Handschrift auf Papier: Unterlängen dürfen
  // die Linie schneiden, das tun sie auf einem Block auch.
  titelflaeche: { flex: 1, justifyContent: "flex-end", paddingBottom: 7 },
  menueflaeche: { justifyContent: "center" },
  zeileTitel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 20,
    color: colors.ink,
    includeFontPadding: false,
  },
  gedrueckt: { opacity: 0.5 },

  fuss: { paddingTop: 20, gap: 8 },
});
