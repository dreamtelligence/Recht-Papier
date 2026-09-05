import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

/**
 * Die drei Punkte am Ende einer Zeile.
 *
 * Sie stehen dort, wo bei anderen Apps ein Mülleimer stünde, und das ist
 * Absicht: Ein dauerhaft sichtbares Löschsymbol neben jeder Rechtsakte macht
 * die zerstörerische Handlung zur auffälligsten auf dem Bildschirm. Drei
 * Punkte sagen „hier gibt es mehr" und lassen die Zeile ruhig.
 *
 * Gezeichnet statt geladen — dieselbe Begründung wie beim Kontozeichen: ein
 * Icon-Paket für ein Symbol brächte einen fremden Zeichensatz ins Papier.
 */
export function MehrKnopf({
  onPress,
  label,
  punkt = 3,
}: {
  onPress: () => void;
  /** Was hier geöffnet wird. Ohne Beschriftung ist das die einzige Auskunft. */
  label: string;
  punkt?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // Drei Punkte sind winzig, die Trefferfläche darf es nicht sein.
      hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
      style={({ pressed }) => [styles.knopf, pressed && styles.gedrueckt]}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: punkt,
            height: punkt,
            borderRadius: punkt / 2,
            backgroundColor: colors.inkSoft,
          }}
        />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knopf: { flexDirection: "row", alignItems: "center", gap: 3 },
  gedrueckt: { opacity: 0.4 },
});
