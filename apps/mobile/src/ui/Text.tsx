import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "@/theme";

/**
 * Die Textrollen, die es im Produkt gibt.
 *
 * Nicht "H1 bis H6": eine Skala nach Größe lädt dazu ein, die Auszeichnung
 * nach Optik zu wählen. Diese Namen sagen, *was* der Text ist — dann bleibt
 * die Typografie über Bildschirme hinweg konsistent, auch wenn sich die
 * Zahlen einmal ändern.
 */

/** Die große Serifen-Zeile, die einen Bildschirm eröffnet. */
export function Headline({ children }: { children: React.ReactNode }) {
  return <Text style={styles.headline}>{children}</Text>;
}

/** Der Titel eines Bildschirms unterhalb des Starts — eine Spur ruhiger. */
export function Title({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text style={styles.titel} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/**
 * Das Aktenregister-Label: Versalien, gesperrt, in Akzentfarbe.
 *
 * Trägt im ganzen Produkt dieselbe Bedeutung — "hier beginnt ein Abschnitt".
 */
export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/** Fließtext. */
export function Body({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text style={styles.fliesstext} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** Der leisere Begleitsatz: Erklärung, Hinweis, Metazeile. */
export function Muted({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text style={styles.leise} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/**
 * Rückmeldung auf eine Handlung.
 *
 * `accessibilityLiveRegion` ist kein Detail: ohne sie liest VoiceOver einen
 * Fehler nicht vor, der nach dem Tippen erscheint — der Bildschirm bleibt
 * dann für blinde Nutzer stumm stehen.
 */
export function Message({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <Text style={styles.meldung} accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

/**
 * Der Trennschnitt zwischen zwei Zeilen eines Registers.
 *
 * Eine Linie trennt, ein Rahmen umschließt. Papier kennt nur das Erste.
 */
export function Rule() {
  return <View style={styles.linie} />;
}

const styles = StyleSheet.create({
  headline: {
    fontFamily: fonts.serif,
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.ink,
    includeFontPadding: false,
  },
  titel: {
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: colors.ink,
    includeFontPadding: false,
  },
  label: {
    fontFamily: fonts.serif,
    fontSize: 11,
    letterSpacing: 1.3,
    lineHeight: 19,
    textTransform: "uppercase",
    color: colors.accentDark,
    includeFontPadding: false,
  },
  fliesstext: { fontSize: 15, lineHeight: 24, color: colors.ink },
  leise: { fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  meldung: { fontSize: 12, lineHeight: 18, color: colors.accentDark },
  linie: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
