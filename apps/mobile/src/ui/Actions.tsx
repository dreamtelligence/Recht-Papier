import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "@/theme";
import { papierTextur } from "./PaperScreen";

/**
 * Die eine Aktion, die auf einem Bildschirm zählt.
 *
 * Gedruckter Block statt Software-Knopf: `radius.action` ist mit 4 bewusst
 * schärfer als die 8 der Eingabefelder, die Beschriftung ist gesetzt wie die
 * Wortmarke, und die Papierkörnung liegt auch über der Fläche — sonst schwebt
 * ein Fremdkörper auf dem Papier statt darauf gedruckt zu sein.
 *
 * 48 statt der üblichen 54 Punkt Höhe: die gefüllte Fläche ist das einzige
 * Massiv auf einem Bildschirm aus Linien und Text und zog sonst mehr Blick als
 * die Headline. 48 bleibt deutlich über Apples 44pt-Mindestziel.
 *
 * Es gibt absichtlich keine `variant`-Prop. Eine Primäraktion, die auch
 * sekundär sein kann, ist keine mehr; der leise Weg heißt `SecondaryAction`
 * und sieht darum vollkommen anders aus.
 */
export function PrimaryAction({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [pressed && !disabled && styles.gedrueckt]}
    >
      <View style={[styles.flaeche, disabled && styles.matt]}>
        <Image source={papierTextur} style={styles.koernung} resizeMode="cover" />
        <Text style={styles.beschriftung}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Der leise Weg: ein Satz, kein Knopf. */
export function SecondaryAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.leise, disabled && styles.matt]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Ein Weg, der etwas zerstört, sieht nicht aus wie einer, der weiterführt.
 *
 * Bewusst kein roter Knopf: die Löschung soll auffindbar sein, wie Apple es
 * verlangt, aber nicht einladend.
 */
export function DangerAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.gefaehrlich, disabled && styles.matt]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Flache Tinte statt Verlauf: ein diagonaler Gradient ist App-Vokabular,
  // gedruckte Farbe hat keinen. overflow versteckt das Korn hinter dem Radius.
  flaeche: {
    minHeight: 48,
    borderRadius: radius.action,
    backgroundColor: colors.accentDark,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 21,
  },
  // Dieselbe Papierstruktur wie der Hintergrund, schwach über die Farbe gelegt.
  koernung: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1 },
  beschriftung: {
    color: colors.onAccent,
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  leise: {
    minHeight: 44,
    paddingTop: 13,
    textAlign: "center",
    fontSize: 13,
    color: colors.accentDark,
    textDecorationLine: "underline",
  },
  gefaehrlich: {
    minHeight: 44,
    paddingTop: 13,
    textAlign: "center",
    fontSize: 12,
    color: colors.inkSoft,
    textDecorationLine: "underline",
  },
  gedrueckt: { transform: [{ translateY: 1 }] },
  matt: { opacity: 0.42 },
});
