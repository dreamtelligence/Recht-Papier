import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { colors, fonts } from "@/theme";

/**
 * Die Kopfzeile innerhalb der App.
 *
 * Bewusst selbst gebaut statt `headerShown: true`: der native Header bringt
 * eine eigene Fläche mit, und jede eigene Fläche unterbricht die Papiertextur,
 * die über den ganzen Bildschirm laufen soll. Der Preis dafür ist, dass Zurück
 * hier von Hand steht — der Gewinn ist ein Blatt statt zweier Kacheln.
 *
 * Der Zurück-Weg ist ausdrücklich sichtbar und nicht nur die Wischgeste: wer
 * sie nicht kennt, sitzt sonst fest.
 */
export function AppHeader({
  titel,
  zurueck = true,
  aktion,
}: {
  titel: string;
  zurueck?: boolean;
  aktion?: { label: string; onPress: () => void };
}) {
  const router = useRouter();

  return (
    <View style={styles.zeile}>
      <View style={styles.links}>
        {zurueck && router.canGoBack() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zurück"
            hitSlop={14}
            onPress={() => router.back()}
          >
            <Text style={styles.zurueck}>‹ Zurück</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.titel} numberOfLines={1}>
        {titel}
      </Text>

      <View style={styles.rechts}>
        {aktion ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={14}
            onPress={aktion.onPress}
          >
            <Text style={styles.aktion}>{aktion.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zeile: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
    marginBottom: 18,
  },
  // Gleich breite Flanken, damit der Titel wirklich mittig sitzt und nicht
  // dorthin rutscht, wo gerade weniger steht.
  links: { width: 78, alignItems: "flex-start" },
  rechts: { width: 78, alignItems: "flex-end" },
  titel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.serif,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.accentDark,
    includeFontPadding: false,
  },
  zurueck: { fontSize: 13, color: colors.accentDark, paddingVertical: 6 },
  aktion: { fontSize: 13, color: colors.accentDark, paddingVertical: 6 },
});
