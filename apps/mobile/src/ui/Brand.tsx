import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/theme";

/**
 * Die Wortmarke: Name, Stift, Anspruch.
 *
 * Steht auf dem Startbildschirm als Absender und in der App als ruhige
 * Kopfzeile. Genau deshalb liegt sie hier und nicht im Startbildschirm — die
 * Marke gehört dem Produkt, nicht einem Screen.
 *
 * Das eingekreiste Monogramm ist bewusst weg. Ein Signet neben einem
 * ausgeschriebenen Namen sagt dasselbe zweimal, und der Kreis war das einzige
 * geschlossene Element auf einer Fläche, die sonst nur aus Linien und Text
 * besteht. Was bleibt, ist der Name — und darunter der Stift, der die
 * Unterlänge des Signets übernimmt.
 */

/**
 * Der freigestellte Stift aus `assets/brand/`. Er ist in Tinte eingefärbt, nicht
 * in Schwarz — auf warmem Papier liest sich reines Schwarz als Fremdkörper.
 */
const bleistift = require("../../assets/brand/bleistift.png");

/** Breite geteilt durch Höhe der Datei. Steht hier, damit ein Zuschnitt der
 *  Grafik hier auffällt und nicht als verzerrter Stift im Kopf. */
const STIFT_VERHAELTNIS = 767 / 67;

export function Brand({
  claim = "Digitale Rechtsassistenz",
  stift = false,
}: {
  claim?: string;
  /**
   * Legt den Bleistift unter den Namen.
   *
   * Bewusst ein Schalter und nicht „immer, wenn kein Anspruch dasteht": zwei
   * Dinge, die zufällig zusammenfallen, sind keine Regel — und wer den Anspruch
   * später auch in der App zeigt, bekäme sonst stillschweigend einen anderen
   * Kopf.
   */
  stift?: boolean;
}) {
  // Die gemessene Breite des Namens. Sie steht hier und nicht als `width: "100%"`
  // im Stil: Prozente lösen gegen einen Elternteil ohne feste Breite nicht auf,
  // und dieser hier bekommt seine Breite erst vom Text darin. Das Ergebnis wäre
  // ein Stift in Originalgröße quer über den Bildschirm.
  const [namensBreite, setNamensBreite] = useState(0);

  return (
    <View style={styles.marke}>
      <Text
        style={styles.name}
        onLayout={(ereignis) => setNamensBreite(ereignis.nativeEvent.layout.width)}
      >
        RECHT &amp; PAPIER
      </Text>
      {/* Der Stift nimmt die Breite des Namens an, nicht umgekehrt: Er liegt
          unter dem Wort, also endet er mit ihm — auch bei größerer
          Systemschrift, die den Namen breiter macht. */}
      {stift && namensBreite > 0 ? (
        <Image
          source={bleistift}
          style={[
            styles.stift,
            { width: namensBreite, height: namensBreite / STIFT_VERHAELTNIS },
          ]}
          resizeMode="contain"
          // Für VoiceOver ist er nichts. Der Name steht schon darüber.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      {claim ? <Text style={styles.anspruch}>{claim}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // `flex-start`, damit die Marke nur so breit wird wie ihr Name. Ohne das
  // dehnt sie sich über die Zeile und der gemessene Wert wäre die Bildschirm-
  // breite statt der Wortbreite — der Stift liefe dann über den Rand hinaus.
  marke: { alignSelf: "flex-start" },
  name: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 1.5,
    color: colors.ink,
    includeFontPadding: false,
  },
  stift: {
    marginTop: 5,
    // Leiser als der Name. Er ist die Beigabe, nicht die Marke.
    opacity: 0.55,
  },
  anspruch: { fontSize: 10, letterSpacing: 0.4, color: colors.inkSoft, marginTop: 3 },
});
