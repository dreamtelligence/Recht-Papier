import type { ReactElement, ReactNode } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type RefreshControlProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

export const papierTextur = require("../../assets/brand/paper-texture.png");

/**
 * Der Grund, auf dem jeder Bildschirm liegt.
 *
 * Die Papiertextur ist keine Dekoration eines einzelnen Bildschirms, sondern
 * die Fläche des ganzen Produkts — deshalb liegt sie hier und nicht in jedem
 * Screen kopiert. Wer die Textur einmal austauscht, tauscht sie überall.
 *
 * Die Safe Area wird bewusst hier verrechnet und nicht per `SafeAreaView`: das
 * Papier läuft bis unter die Statusleiste, nur der *Inhalt* rückt ein. Ein
 * weißer Streifen über der Textur wäre der sichtbarste Weg, die Illusion zu
 * zerstören.
 */
export function PaperScreen({
  children,
  oben = 22,
  unten = 8,
  onLayout,
}: {
  children: ReactNode;
  /** Zusatzabstand über der Safe Area. */
  oben?: number;
  /** Zusatzabstand unter dem Inhalt, über dem Home-Indikator. */
  unten?: number;
  onLayout?: (ereignis: LayoutChangeEvent) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={papierTextur}
      resizeMode="cover"
      style={styles.flaeche}
      onLayout={onLayout}
    >
      <View
        style={[
          styles.inhalt,
          { paddingTop: insets.top + oben, paddingBottom: insets.bottom + unten },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
}

/**
 * Dieselbe Fläche, wenn der Inhalt länger wird als der Bildschirm.
 *
 * Die Tastaturbehandlung steht hier und nicht in den Formularen: sie ist auf
 * jedem Formular dieselbe, und jede Kopie ist eine Gelegenheit, sie einmal
 * anders zu machen. `keyboardShouldPersistTaps="handled"` ist dabei der
 * unscheinbare, aber wichtige Teil — ohne ihn verschluckt der erste Tap bei
 * offener Tastatur den Knopf darunter, und der Nutzer tippt zweimal auf
 * "Anmelden", ohne dass etwas passiert.
 */
export function PaperScrollScreen({
  children,
  oben = 18,
  unten = 28,
  refreshControl,
}: {
  children: ReactNode;
  oben?: number;
  unten?: number;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={papierTextur} resizeMode="cover" style={styles.flaeche}>
      <KeyboardAvoidingView
        style={styles.flaeche}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ marginTop: insets.top }}
          contentContainerStyle={[
            styles.rollInhalt,
            { paddingTop: oben, paddingBottom: insets.bottom + unten },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1, backgroundColor: colors.paper },
  inhalt: { flex: 1, paddingHorizontal: spacing.page },
  rollInhalt: { paddingHorizontal: spacing.page, flexGrow: 1 },
});
