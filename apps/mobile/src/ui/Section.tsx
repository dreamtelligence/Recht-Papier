import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "@/theme";
import { Label, Muted } from "./Text";

/**
 * Ein Abschnitt der Fallakte.
 *
 * Abschnitte ohne Inhalt verschwinden nicht, sondern sagen, was fehlt und
 * warum. Das ist ehrlicher als sie auszublenden — die Struktur der Akte soll
 * sichtbar sein, auch wo sie noch leer ist — und zugleich das Gegenteil eines
 * Platzhalters, der Inhalt vortäuscht.
 */
export function Section({
  titel,
  leer,
  children,
}: {
  titel: string;
  leer?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.abschnitt}>
      <Label style={styles.titel}>{titel}</Label>
      {children ?? <Muted>{leer}</Muted>}
    </View>
  );
}

/** Wartezustand, der die Papierfläche nicht verlässt. */
export function Waiting() {
  return (
    <View style={styles.mitte}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  abschnitt: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  titel: { marginBottom: 10 },
  mitte: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.paper,
  },
});
