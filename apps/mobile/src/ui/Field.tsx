import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fonts, radius } from "@/theme";

type FieldProps = TextInputProps & {
  label: string;
  hinweis?: string;
};

/**
 * Ein beschriftetes Eingabefeld.
 *
 * `fontSize` steht überall auf mindestens 16 — darunter zoomt iOS beim Fokus
 * in die Ansicht und das Layout springt. Das ist keine Geschmacksfrage,
 * sondern eine Plattformregel, und deshalb steht sie hier einmal statt in
 * jedem Formular neu.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hinweis, style, ...props },
  ref,
) {
  return (
    <View style={styles.gruppe}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.eingabe, style]}
        placeholderTextColor={colors.inkSoft}
        {...props}
      />
      {hinweis ? <Text style={styles.hinweis}>{hinweis}</Text> : null}
    </View>
  );
});

/** Mehrzeilig, für die Schilderung des Sachverhalts. */
export const TextArea = forwardRef<TextInput, FieldProps>(function TextArea(
  { label, hinweis, style, ...props },
  ref,
) {
  return (
    <View style={styles.gruppe}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.textflaeche, style]}
        placeholderTextColor={colors.inkSoft}
        multiline
        textAlignVertical="top"
        {...props}
      />
      {hinweis ? <Text style={styles.hinweis}>{hinweis}</Text> : null}
    </View>
  );
});

/**
 * Das Feld für den sechsstelligen Anmeldecode.
 *
 * `textContentType="oneTimeCode"` ist der Unterschied zwischen "aus der Mail
 * abtippen" und "einmal tippen": iOS bietet den Code dann direkt über der
 * Tastatur an.
 */
export const CodeField = forwardRef<TextInput, Omit<FieldProps, "label"> & { label?: string }>(
  function CodeField({ label = "Code aus der E-Mail", style, ...props }, ref) {
    return (
      <Field
        ref={ref}
        label={label}
        style={[styles.code, style]}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        placeholder="000000"
        {...props}
      />
    );
  },
);

const feld = {
  borderWidth: 1,
  borderColor: "rgba(49, 48, 40, 0.18)",
  borderRadius: radius.control,
  backgroundColor: "rgba(255, 253, 247, 0.64)",
  color: colors.ink,
} as const;

const styles = StyleSheet.create({
  gruppe: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: colors.ink },
  eingabe: { ...feld, minHeight: 48, paddingHorizontal: 13, fontSize: 16 },
  textflaeche: {
    ...feld,
    minHeight: 118,
    padding: 13,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
  },
  code: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: fonts.serif,
    includeFontPadding: false,
  },
  hinweis: { fontSize: 11, color: colors.inkSoft },
});
