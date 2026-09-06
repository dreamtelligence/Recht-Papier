import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Brand, Headline, Muted, PaperScreen, PrimaryAction } from "@/ui";
import { colors, fonts } from "@/theme";

const ballon = require("../assets/brand/balloon-relief.png");

/**
 * Der Startbildschirm. Nur Start.
 *
 * Hier steht ausdrücklich **nichts** aus der App: keine Fallakte, kein
 * Anlegen, kein Abmelden, keine Kontolöschung. Eine Startseite, die
 * gleichzeitig Funktionen trägt, ist keine Startseite mehr, sondern eine App
 * mit Werbung obendrauf — und jede Funktion, die hier landet, muss doppelt
 * gedacht werden: einmal für Angemeldete, einmal für alle anderen.
 *
 * Die Grenze ist im Router gezogen: dieser Bildschirm existiert nur, solange
 * niemand angemeldet ist (`Stack.Protected` in `app/_layout.tsx`). Wer sich
 * anmeldet, sieht ihn nicht wieder, bis er sich abmeldet.
 *
 * Was hier steht, ist genau das Versprechen: der Ballonmann, "Recht verstehen.
 * Besser reagieren.", die drei Schritte des Registers — und ein Weg hinein.
 */
export default function Start() {
  const router = useRouter();

  // Ankunft: der Ballon steigt federnd an seinen Platz, danach blendet der Rest
  // gestaffelt auf. Der native Startbildschirm ist reines Papier und damit das
  // erste Bild dieser Bewegung — so gibt es keinen sichtbaren Wechsel.
  const reduziert = useReducedMotion();
  const ballonHub = useSharedValue(reduziert ? 0 : 130);
  const ballonBlende = useSharedValue(reduziert ? 1 : 0);
  const restBlende = useSharedValue(reduziert ? 1 : 0);
  const restHub = useSharedValue(reduziert ? 0 : 14);

  useEffect(() => {
    if (reduziert) return;
    ballonBlende.value = withTiming(1, { duration: 220 });
    // Leichtes Überschwingen lässt ihn ankommen statt einrasten.
    ballonHub.value = withSpring(0, { damping: 13, stiffness: 85, mass: 0.9 });
    restBlende.value = withDelay(380, withTiming(1, { duration: 340 }));
    restHub.value = withDelay(380, withTiming(0, { duration: 340 }));
  }, [reduziert]);

  const ballonStil = useAnimatedStyle(() => ({
    opacity: ballonBlende.value,
    transform: [{ translateY: ballonHub.value }],
  }));
  const restStil = useAnimatedStyle(() => ({
    opacity: restBlende.value,
    transform: [{ translateY: restHub.value }],
  }));

  return (
    <PaperScreen>
      <Animated.View style={restStil}>
        <Brand />
      </Animated.View>

      <View style={styles.hero}>
        <Animated.Image
          source={ballon}
          style={[styles.heroBild, ballonStil]}
          resizeMode="contain"
          accessibilityLabel="Handgezeichneter Heißluftballon, der einen Mann im Anzug vom Boden abhebt"
        />
      </View>

      <Animated.View style={[styles.text, restStil]}>
        <Headline>Recht verstehen.{"\n"}Besser reagieren.</Headline>
        <Muted>Schildern Sie, was passiert ist — wir ordnen den Rest.</Muted>
      </Animated.View>

      {/* Ein Aktenregister, keine Produkt-Tour: Kapitälchen-Label links, die
          Zusage rechts, dazwischen Haarlinien. Nummerierte Kreise wären
          Onboarding-Vokabular und stünden quer zum Papiercharakter; die
          Reihenfolge trägt die Leserichtung statt einer Ziffer. */}
      <Animated.View style={[styles.register, restStil]}>
        {SCHRITTE.map((eintrag, i) => (
          <View
            key={eintrag.label}
            style={[styles.registerZeile, i > 0 && styles.registerZeileGetrennt]}
          >
            <Text style={styles.registerLabel}>{eintrag.label}</Text>
            <Text style={styles.registerDetail}>{eintrag.detail}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.aktionen, restStil]}>
        <PrimaryAction label="Fall beginnen" onPress={() => router.push("/anmelden")} />
        {/* Deutschland statt Frankfurt: die Falldaten liegen zwar real in
            Frankfurt (Supabase eu-central-1), aber der Ortsname wirft beim
            Leser eine Frage auf, statt eine zu beantworten. Das Land ist die
            Aussage, die trägt. "Keine Speicherung" wäre falsch — die Fallakte
            ist ausdrücklich dauerhaft. */}
        <Text style={styles.datenschutz}>Fallakte in Deutschland gespeichert</Text>
        <Text style={styles.rechtshinweis}>Ersetzt keine Rechtsberatung.</Text>
      </Animated.View>
    </PaperScreen>
  );
}

const SCHRITTE = [
  { label: "Schildern", detail: "Sachverhalt und Dokumente" },
  { label: "Einordnen", detail: "Abgleich mit Gesetzen und Urteilen" },
  { label: "Reagieren", detail: "Nächste Schritte und Handlungsmöglichkeiten" },
] as const;

const styles = StyleSheet.create({
  hero: { height: 214, marginTop: 10, alignItems: "center", justifyContent: "center" },
  heroBild: { width: 152, height: 212, opacity: 0.94 },

  // Luft unter der Zeichnung: der Ballonmann bekommt Raum nach unten, und der
  // Textblock samt Schritten rückt als Ganzes nach.
  text: { marginTop: 30, gap: 11 },

  register: { marginTop: 24 },
  registerZeile: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 11 },
  // Die Linie trennt, statt zu umranden: kein Kasten, nur der Registerschnitt.
  registerZeileGetrennt: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  registerLabel: {
    // Feste Spaltenbreite, damit die rechte Spalte über alle Zeilen fluchtet.
    width: 98,
    fontFamily: fonts.serif,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.accentDark,
    // Gleiche Zeilenhöhe wie rechts, sonst sitzt das Label eine Spur zu hoch.
    lineHeight: 19,
    includeFontPadding: false,
  },
  registerDetail: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },

  // Bleibt unten am sicheren Rand, ohne feste Bildschirmhöhe anzunehmen.
  aktionen: { marginTop: "auto", paddingTop: 28 },
  datenschutz: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: colors.inkSoft,
  },
  // Der Hinweis bleibt vollständig lesbar — kleiner zu setzen wäre bei einem
  // Rechtsprodukt das falsche Signal. Nur der Abstand rückt zusammen, damit
  // Fußnote und Hinweis als ein Block wirken statt als Warnung unter der Aktion.
  rechtshinweis: { marginTop: 2, textAlign: "center", fontSize: 11, color: colors.inkSoft },
});
