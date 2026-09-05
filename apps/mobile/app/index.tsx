import { useCallback, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { colors, fonts, radius } from "../theme";

const paper = require("../assets/brand/paper-texture.png");
const balloon = require("../assets/brand/balloon-relief.png");

type Attachment = { name: string; uri: string; mimeType?: string; size?: number };

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [caseStarted, setCaseStarted] = useState(false);

  const snapPoints = useMemo(() => ["76%"], []);

  const openSheet = useCallback(() => sheetRef.current?.snapToIndex(0), []);
  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "image/*",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setAttachment({ name: file.name, uri: file.uri, mimeType: file.mimeType, size: file.size });
  }, []);

  const canSubmit = description.trim().length >= 8 && attachment !== null;

  const beginCase = useCallback(() => {
    if (!canSubmit) return;
    setCaseStarted(true);
    closeSheet();
  }, [canSubmit, closeSheet]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.34} />
    ),
    [],
  );

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen}>
      <View
        style={[
          styles.content,
          // Der Fussblock sitzt direkt ueber dem Home-Indikator: nur die
          // Safe-Area des Geraets plus ein schmaler Atemabstand, kein fester Rand.
          { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={styles.brandLine}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>R&amp;P</Text>
          </View>
          <View>
            <Text style={styles.brandName}>RECHT &amp; PAPIER</Text>
            <Text style={styles.brandClaim}>Digitale Rechtsassistenz</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Image
            source={balloon}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityLabel="Handgezeichneter Heißluftballon, der einen Mann im Anzug vom Boden abhebt"
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>Recht verstehen.{"\n"}Leichter weitergehen.</Text>
          <Text style={styles.intro}>Schildern Sie, was passiert ist — wir ordnen den Rest.</Text>
        </View>

        {/* Fuellt die Leere zwischen Absatz und Aktion mit Substanz und zeigt,
            dass die Seite hier nicht zu Ende ist. */}
        <View style={styles.steps}>
          {[
            "Sachverhalt schildern und Anschreiben hinzufügen",
            "Wir ordnen den Fall und prüfen Gesetze und Urteile",
            "Sie sehen nächste Schritte — mit Quelle und Rechtsstand",
          ].map((label, i) => (
            <View key={label} style={styles.step}>
              <View style={styles.stepMarker}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {caseStarted ? (
          <View style={styles.caseCreated} accessibilityLiveRegion="polite">
            <Text style={styles.caseCreatedTitle}>Ihr Fall ist angelegt</Text>
            <Text style={styles.caseCreatedDetail} numberOfLines={1}>
              {attachment?.name ?? description}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={openSheet} style={({ pressed }) => [pressed && styles.pressed]}>
            <LinearGradient
              colors={[colors.accentDark, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionLabel}>
                {caseStarted ? "Fall ergänzen" : "Fall beginnen"}
              </Text>
              <Text style={styles.primaryActionArrow}>→</Text>
            </LinearGradient>
          </Pressable>
          {/* Konkret statt unbestimmt: die Falldaten liegen in Frankfurt
              (Supabase eu-central-1). "Keine Speicherung" waere falsch - die
              Fallakte ist ausdruecklich dauerhaft. */}
          <Text style={styles.privacyNote}>Ihre Daten bleiben in Deutschland · Quellen werden sichtbar</Text>
          <Text style={styles.legalNote}>Ersetzt keine Rechtsberatung.</Text>
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        // Das Sheet geht ruhig auf; die Tastatur kommt erst beim Tippen ins Feld.
        // Beim Tippen fährt es mit der Tastatur nach oben statt zu springen.
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={[styles.sheetBody, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.sheetTitle}>Worum geht es?</Text>
          <Text style={styles.sheetDescription}>
            Beschreiben Sie kurz Ihren Fall und fügen Sie Ihr Anschreiben direkt hinzu.
          </Text>

          <Text style={styles.fieldLabel}>Was ist passiert?</Text>
          <BottomSheetTextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Zum Beispiel: Ich habe gestern eine Kündigung erhalten …"
            placeholderTextColor={colors.inkSoft}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            onPress={pickDocument}
            style={({ pressed }) => [styles.attachmentButton, pressed && styles.pressed]}
          >
            <Text style={styles.attachmentLabel} numberOfLines={1}>
              {attachment?.name ?? "Anschreiben hinzufügen"}
            </Text>
          </Pressable>
          <Text style={styles.hint}>PDF, DOCX oder Bild · vertraulich verarbeitet</Text>

          <Pressable onPress={beginCase} disabled={!canSubmit}>
            <LinearGradient
              colors={[colors.accentDark, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryAction, !canSubmit && styles.disabled]}
            >
              <Text style={styles.primaryActionLabel}>Fall anlegen</Text>
              <Text style={styles.primaryActionArrow}>→</Text>
            </LinearGradient>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, paddingHorizontal: 28 },

  brandLine: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(36, 37, 31, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: "700", color: colors.ink },
  brandName: { fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.5, color: colors.ink },
  brandClaim: { fontSize: 10, letterSpacing: 0.4, color: colors.inkSoft, marginTop: 3 },

  hero: { height: 214, marginTop: 10, alignItems: "center", justifyContent: "center" },
  heroImage: { width: 152, height: 212, opacity: 0.94 },
  copy: { gap: 11 },

  steps: { marginTop: 26, gap: 13 },
  step: { flexDirection: "row", alignItems: "center", gap: 11 },
  stepMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(52, 73, 79, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontFamily: fonts.serif,
    fontSize: 11,
    textAlign: "center",
    color: colors.accentDark,
    includeFontPadding: false,
    // Georgias Ziffern sitzen in der Zeilenbox eine Spur zu tief.
    marginTop: -1,
  },
  stepLabel: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 35,
    lineHeight: 37,
    letterSpacing: -1,
    color: colors.ink,
  },
  intro: { fontSize: 14, lineHeight: 22, color: colors.inkSoft, maxWidth: 320 },

  caseCreated: {
    marginTop: 18,
    padding: 13,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "rgba(69, 91, 82, 0.22)",
    backgroundColor: "rgba(236, 240, 231, 0.72)",
    gap: 4,
  },
  caseCreatedTitle: { fontSize: 13, fontWeight: "700", color: colors.success },
  caseCreatedDetail: { fontSize: 12, color: "#5f665e" },

  // Bleibt unten am sicheren Rand, ohne feste Bildschirmhöhe anzunehmen.
  actions: { marginTop: "auto", paddingTop: 28 },
  primaryAction: {
    minHeight: 54,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 21,
  },
  primaryActionLabel: { color: colors.onAccent, fontSize: 15, fontWeight: "600" },
  primaryActionArrow: { color: colors.onAccent, fontSize: 17 },
  disabled: { opacity: 0.42 },
  pressed: { transform: [{ translateY: 1 }] },
  privacyNote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: colors.inkSoft,
  },
  legalNote: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 11,
    color: colors.inkSoft,
  },

  sheetBackground: { backgroundColor: colors.paper, borderRadius: radius.sheet },
  sheetHandle: { backgroundColor: "rgba(57, 55, 46, 0.24)", width: 42, height: 5 },
  sheetBody: { paddingHorizontal: 22, gap: 11 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sheetDescription: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginBottom: 3 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.ink },
  textArea: {
    minHeight: 118,
    borderWidth: 1,
    borderColor: "rgba(49, 48, 40, 0.18)",
    borderRadius: radius.control,
    backgroundColor: "rgba(255, 253, 247, 0.64)",
    padding: 13,
    fontFamily: fonts.serif,
    // 16 und größer, sonst zoomt iOS beim Fokus in die Ansicht.
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  attachmentButton: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "rgba(52, 73, 79, 0.28)",
    backgroundColor: "rgba(255, 253, 247, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  attachmentLabel: { fontSize: 13, fontWeight: "600", color: colors.accentDark },
  hint: { fontSize: 11, color: colors.inkSoft },
});
