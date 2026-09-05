import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/theme";

/**
 * Die leeren Zeilen eines Notizblocks.
 *
 * Sie liegen bewusst **nur unter dem Inhalt**, nicht hinter ihm. Ein Block, der
 * seine Linien auch durch den geschriebenen Text zieht, muss sie auf die
 * Grundlinien der Schrift legen — sonst schneidet eine Linie durch Unterlängen
 * und liest sich als Fehler statt als Papier. Diese Ausrichtung hält bei
 * variabler Zeilenzahl, dynamischer Schriftgröße und zweizeiligen Titeln nicht.
 *
 * Unterhalb des letzten Eintrags stellt sich die Frage nicht, und dort wird die
 * Lineatur erst nützlich: Die freie Fläche ist danach kein Loch mehr, sondern
 * Platz, der auf etwas wartet.
 *
 * Deshalb gibt es hier auch kein `flex: 1`, sondern zwei gemessene Zahlen. Wer
 * sie nicht messen will, zeichnet keine Lineatur — und das ist genau richtig,
 * denn eine volle Seite hat keine leeren Zeilen.
 */

/** Zeilenabstand. Etwas weiter als eine Textzeile — Papier atmet. */
export const ZEILE = 34;

export function Lineatur({
  /** Wo die erste Zeile beginnt, gemessen ab der Oberkante der Fläche. */
  versatz = 0,
  /** Wie viel Platz ab dort noch frei ist. */
  hoehe,
}: {
  versatz?: number;
  hoehe: number;
}) {
  const linien = useMemo(() => {
    const anzahl = Math.floor(hoehe / ZEILE);
    return Array.from({ length: Math.max(anzahl, 0) }, (_, i) => i);
  }, [hoehe]);

  if (!linien.length) return null;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      // Für VoiceOver ist eine Linie kein Inhalt. Ohne das wandert der Fokus
      // durch zwölf leere Elemente, bevor er den nächsten Fall erreicht.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {linien.map((i) => (
        <View
          key={i}
          style={[
            styles.linie,
            // Gleichmäßig, ohne Verlauf. Solange die Lineatur nur unter dem
            // Inhalt lag, ließ ein Ausblenden die Seite auslaufen. Jetzt sitzen
            // die Einträge selbst auf Linien desselben Rasters — ein Verlauf
            // würde die geschriebenen Zeilen von den leeren unterscheiden, und
            // genau das tut ein Notizblock nicht.
            { top: versatz + ZEILE * (i + 1) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linie: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.lineSoft,
  },
});
