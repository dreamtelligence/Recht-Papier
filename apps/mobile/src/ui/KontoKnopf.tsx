import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

/**
 * Der Zugang zum Konto, oben rechts.
 *
 * Vorher stand hier das Wort „Konto". Ein Wort neben der Wortmarke lässt den
 * Kopf wie eine Navigationsleiste mit zwei Titeln lesen; ein Zeichen ordnet
 * sich unter und lässt den Namen allein stehen.
 *
 * Die Figur ist aus zwei Flächen gezeichnet und kein Icon-Paket: eine
 * Abhängigkeit für ein einziges Symbol brächte einen ganzen Zeichensatz und
 * eine fremde Strichstärke ins Papier. So trägt sie dieselbe Haarlinie wie die
 * Trennschnitte und wächst mit `groesse` mit, statt in festen Stufen zu
 * springen.
 *
 * Ohne Beschriftung ist das `accessibilityLabel` nicht Kür, sondern die einzige
 * Stelle, an der noch „Konto" steht.
 */
export function KontoKnopf({
  onPress,
  groesse = 19,
}: {
  onPress: () => void;
  groesse?: number;
}) {
  const kopf = groesse * 0.46;
  const schultern = groesse * 0.86;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Konto"
      onPress={onPress}
      // Die Figur ist klein, die Trefferfläche darf es nicht sein. 12 Punkte
      // ringsum bringen sie über die 44, die eine Fingerkuppe braucht.
      hitSlop={12}
      style={({ pressed }) => [styles.knopf, pressed && styles.gedrueckt]}
    >
      <View
        style={{
          width: kopf,
          height: kopf,
          borderRadius: kopf / 2,
          borderWidth: 1.1,
          borderColor: colors.accentDark,
        }}
      />
      {/* Die Schultern sind ein oben gerundeter Rahmen ohne Unterkante — ein
          Halbbogen, wie ihn eine Feder in einem Zug zieht. */}
      <View
        style={{
          width: schultern,
          height: schultern / 2,
          marginTop: groesse * 0.1,
          borderWidth: 1.1,
          borderBottomWidth: 0,
          borderColor: colors.accentDark,
          borderTopLeftRadius: schultern / 2,
          borderTopRightRadius: schultern / 2,
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knopf: { alignItems: "center", justifyContent: "flex-end" },
  gedrueckt: { opacity: 0.5 },
});
