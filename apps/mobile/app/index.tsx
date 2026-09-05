import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { colors, fonts, radius } from "../theme";
import { createCase, loadLatestCase, type CaseSummary } from "../lib/cases";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const paper = require("../assets/brand/paper-texture.png");
const balloon = require("../assets/brand/balloon-relief.png");

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

// Supabase antwortet englisch. Diese Texte stehen im Sheet direkt neben der
// deutschen Oberflaeche, deshalb werden sie hier uebersetzt statt durchgereicht.
function beschreibeFehler(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/rate limit|after \d+ seconds?/i.test(message)) {
    return "Zu viele Anfragen. Bitte einen Moment warten.";
  }
  if (/expired|invalid|token/i.test(message)) {
    return "Der Code stimmt nicht oder ist abgelaufen.";
  }
  if (/email/i.test(message)) {
    return "Mit dieser E-Mail-Adresse hat es nicht geklappt.";
  }
  return "Das hat nicht geklappt. Bitte erneut versuchen.";
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Der E-Mail-Code ist der Hauptweg; Passwort bleibt als Zweitweg fuer
  // Bestandskonten erreichbar, wird aber nicht mehr angeboten.
  const [authMode, setAuthMode] = useState<"code" | "password">("code");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [latestCase, setLatestCase] = useState<CaseSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setLatestCase(null);
      return;
    }

    let active = true;
    loadLatestCase(session.user.id)
      .then((value) => active && setLatestCase(value))
      .catch(() => active && setMessage("Die Fallakte konnte nicht geladen werden."));
    return () => {
      active = false;
    };
  }, [session]);

  // Ankunft: der Ballon steigt federnd an seinen Platz, danach blendet der Rest
  // gestaffelt auf. Der native Startbildschirm ist reines Papier und damit das
  // erste Bild dieser Bewegung - so gibt es keinen sichtbaren Wechsel.
  const reduceMotion = useReducedMotion();
  const balloonRise = useSharedValue(reduceMotion ? 0 : 130);
  const balloonFade = useSharedValue(reduceMotion ? 1 : 0);
  const restFade = useSharedValue(reduceMotion ? 1 : 0);
  const restRise = useSharedValue(reduceMotion ? 0 : 14);

  useEffect(() => {
    if (reduceMotion) return;
    balloonFade.value = withTiming(1, { duration: 220 });
    // Leichtes Ueberschwingen laesst ihn ankommen statt einrasten.
    balloonRise.value = withSpring(0, { damping: 13, stiffness: 85, mass: 0.9 });
    restFade.value = withDelay(380, withTiming(1, { duration: 340 }));
    restRise.value = withDelay(380, withTiming(0, { duration: 340 }));
  }, [reduceMotion]);

  const balloonStyle = useAnimatedStyle(() => ({
    opacity: balloonFade.value,
    transform: [{ translateY: balloonRise.value }],
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity: restFade.value,
    transform: [{ translateY: restRise.value }],
  }));

  // Sperrfrist zwischen zwei Code-Anforderungen. Supabase drosselt ohnehin
  // serverseitig; das hier verhindert nur, dass die Oberflaeche zu einer
  // Anforderung einlaedt, die abgelehnt wuerde.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Erst wenn dieser Bildschirm sein Bild hat, gibt der Splash frei.
  const revealApp = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const snapPoints = useMemo(() => ["76%"], []);

  const openSheet = useCallback(() => {
    setMessage("");
    sheetRef.current?.snapToIndex(0);
  }, []);
  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "image/*",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    if (file.size && file.size > MAX_DOCUMENT_BYTES) {
      setMessage("Das Dokument darf höchstens 20 MB groß sein.");
      return;
    }
    setMessage("");
    setAttachment(file);
  }, []);

  const canSubmit = description.trim().length >= 8 && attachment !== null && session && !busy;
  const emailLooksValid = /\S+@\S+\.\S+/.test(email.trim());
  const canRequestCode = emailLooksValid && !busy && cooldown === 0;
  const canVerifyCode = code.trim().length === 6 && !busy;
  const canAuthenticate = emailLooksValid && password.length >= 8 && !busy;

  // Nur noch Anmeldung, keine Registrierung: neue Konten entstehen ausschliesslich
  // ueber den Code-Weg, damit niemand mehr ein Passwort setzen muss. Bestehende
  // Passwoerter funktionieren weiter.
  const authenticate = useCallback(
    async () => {
      if (!canAuthenticate || !isSupabaseConfigured) return;
      setBusy(true);
      setMessage("");
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      } catch (error) {
        setMessage(beschreibeFehler(error));
      } finally {
        setBusy(false);
      }
    },
    [canAuthenticate, email, password],
  );

  const normalizedEmail = useCallback(() => email.trim().toLowerCase(), [email]);

  const requestCode = useCallback(async () => {
    if (!canRequestCode || !isSupabaseConfigured) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail(),
        // Bewusst true: bekannte und unbekannte Adressen bekommen dieselbe
        // Antwort. Mit false verriete die Fehlermeldung, zu welcher Adresse ein
        // Konto existiert - bei einer Rechtsakte ist schon das eine Auskunft.
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setCodeSent(true);
      setCooldown(60);
      setMessage("Wenn die Adresse nutzbar ist, liegt gleich ein sechsstelliger Code im Postfach.");
    } catch (error) {
      // Supabase nennt die Restzeit im Text; die uebernehmen wir als Countdown.
      const wartezeit = Number(
        (error instanceof Error ? error.message : "").match(/after (\d+) seconds?/)?.[1] ?? 0,
      );
      if (wartezeit > 0) {
        setCooldown(wartezeit);
        // Entscheidend: trotzdem auf die Codeeingabe wechseln. Wer in die Sperre
        // laeuft, hat meist schon eine Mail bekommen - ohne diesen Zweig sieht er
        // den gueltigen Code im Postfach und hat kein Feld, um ihn einzugeben.
        setCodeSent(true);
        setMessage(`Ein Code ist bereits unterwegs. Neuer Code in ${wartezeit} Sekunden.`);
      } else {
        setMessage(beschreibeFehler(error));
      }
    } finally {
      setBusy(false);
    }
  }, [canRequestCode, normalizedEmail]);

  const submitCode = useCallback(async () => {
    if (!canVerifyCode || !isSupabaseConfigured) return;
    setBusy(true);
    setMessage("");
    try {
      // Dieselbe normalisierte Adresse wie beim Anfordern - sonst findet
      // Supabase den Code nicht.
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      setCode("");
      setCodeSent(false);
    } catch (error) {
      setMessage(beschreibeFehler(error));
    } finally {
      setBusy(false);
    }
  }, [canVerifyCode, code, normalizedEmail]);

  // Apple verlangt die vollstaendige Loeschung aus der App heraus, sobald sie
  // Konten anlegt (Guideline 5.1.1(v)). Die eigentliche Arbeit macht die Edge
  // Function - sie braucht den service_role-Schluessel, der nie auf ein Geraet
  // gehoert. Der Client schickt nur sein normales Nutzertoken mit.
  const deleteAccount = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (!data?.deleted) throw new Error("unerwartete Antwort");
      // Das Konto existiert nicht mehr; ein serverseitiges Abmelden liefe ins
      // Leere. Nur die lokale Sitzung raeumen.
      await supabase.auth.signOut({ scope: "local" });
      setLatestCase(null);
      setDescription("");
      setAttachment(null);
      setEmail("");
      setCode("");
      setCodeSent(false);
      closeSheet();
    } catch {
      setMessage("Das Konto konnte nicht gelöscht werden. Bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }, [closeSheet]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      "Konto und Fallakte löschen?",
      "Ihre Fallakte, alle hochgeladenen Dokumente und Ihr Konto werden dauerhaft gelöscht. "
        + "Das lässt sich nicht rückgängig machen.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Endgültig löschen", style: "destructive", onPress: deleteAccount },
      ],
    );
  }, [deleteAccount]);

  const beginCase = useCallback(async () => {
    if (!canSubmit || !attachment || !session) return;
    setBusy(true);
    setMessage("");
    try {
      const created = await createCase(session.user.id, description, attachment);
      setLatestCase(created);
      setDescription("");
      setAttachment(null);
      closeSheet();
    } catch {
      setMessage("Der Fall konnte nicht sicher gespeichert werden. Bitte versuchen Sie es erneut.");
    } finally {
      setBusy(false);
    }
  }, [attachment, canSubmit, closeSheet, description, session]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.34} />
    ),
    [],
  );

  return (
    <ImageBackground source={paper} resizeMode="cover" style={styles.screen} onLayout={revealApp}>
      <View
        style={[
          styles.content,
          // Der Fussblock sitzt direkt ueber dem Home-Indikator: nur die
          // Safe-Area des Geraets plus ein schmaler Atemabstand, kein fester Rand.
          { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Animated.View style={[styles.brandLine, restStyle]}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>R&amp;P</Text>
          </View>
          <View>
            <Text style={styles.brandName}>RECHT &amp; PAPIER</Text>
            <Text style={styles.brandClaim}>Digitale Rechtsassistenz</Text>
          </View>
        </Animated.View>

        <View style={styles.hero}>
          <Animated.Image
            source={balloon}
            style={[styles.heroImage, balloonStyle]}
            resizeMode="contain"
            accessibilityLabel="Handgezeichneter Heißluftballon, der einen Mann im Anzug vom Boden abhebt"
          />
        </View>

        <Animated.View style={[styles.copy, restStyle]}>
          <Text style={styles.headline}>Recht verstehen.{"\n"}Besser reagieren.</Text>
          <Text style={styles.intro}>Schildern Sie, was passiert ist — wir ordnen den Rest.</Text>
        </Animated.View>

        {/* Ein Aktenregister, keine Produkt-Tour: Kapitaelchen-Label links, die
            Zusage rechts, dazwischen Haarlinien. Nummerierte Kreise waren
            Onboarding-Vokabular und standen quer zum Papiercharakter; die
            Reihenfolge traegt jetzt die Leserichtung statt einer Ziffer. */}
        <Animated.View style={[styles.register, restStyle]}>
          {[
            { label: "Schildern", detail: "Sachverhalt und Dokumente" },
            { label: "Einordnen", detail: "Abgleich mit Gesetzen und Urteilen" },
            { label: "Reagieren", detail: "Nächste Schritte und Handlungsmöglichkeiten" },
          ].map((entry, i) => (
            <View
              key={entry.label}
              style={[styles.registerRow, i > 0 && styles.registerRowDivided]}
            >
              <Text style={styles.registerLabel}>{entry.label}</Text>
              <Text style={styles.registerDetail}>{entry.detail}</Text>
            </View>
          ))}
        </Animated.View>

        {latestCase ? (
          <View style={styles.caseCreated} accessibilityLiveRegion="polite">
            <Text style={styles.caseCreatedTitle}>Ihre Fallakte</Text>
            <Text style={styles.caseCreatedDetail} numberOfLines={1}>
              {latestCase.title}
            </Text>
            <Text style={styles.caseCreatedMeta}>Entwurf · dauerhaft gespeichert</Text>
          </View>
        ) : null}

        <Animated.View style={[styles.actions, restStyle]}>
          <Pressable onPress={openSheet} style={({ pressed }) => [pressed && styles.pressed]}>
            <View style={styles.primaryAction}>
              <Image source={paper} style={styles.primaryActionGrain} resizeMode="cover" />
              <Text style={styles.primaryActionLabel}>
                {latestCase ? "Weiteren Fall beginnen" : "Fall beginnen"}
              </Text>
            </View>
          </Pressable>
          {/* Deutschland statt Frankfurt: die Falldaten liegen zwar real in
              Frankfurt (Supabase eu-central-1), aber der Ortsname wirft beim
              Leser eine Frage auf, statt eine zu beantworten. Das Land ist die
              Aussage, die traegt. "Keine Speicherung" waere falsch - die
              Fallakte ist ausdruecklich dauerhaft. */}
          <Text style={styles.privacyNote}>Fallakte in Deutschland gespeichert · Quellen werden sichtbar</Text>
          <Text style={styles.legalNote}>Ersetzt keine Rechtsberatung.</Text>
          {session ? (
            <View style={styles.accountRow}>
              <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()}>
                <Text style={styles.signOut}>Abmelden</Text>
              </Pressable>
              <Text style={styles.accountSeparator}>·</Text>
              {/* Nicht versteckt: Apple verlangt, dass die Loeschung in der App
                  auffindbar ist, nicht nur auf Nachfrage beim Support. */}
              <Pressable
                accessibilityRole="button"
                onPress={confirmDeleteAccount}
                disabled={busy}
              >
                <Text style={[styles.signOut, busy && styles.disabled]}>Konto löschen</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
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
          {/* Ein sichtbarer Weg zurueck. Nur auf die Wischgeste zu setzen laesst
              Leute im Sheet festsitzen, die sie nicht kennen - und wer hier
              zoegert, will oft genau das: erstmal wieder raus. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            hitSlop={12}
            onPress={closeSheet}
            style={styles.sheetClose}
          >
            <Text style={styles.sheetCloseGlyph}>×</Text>
          </Pressable>
          {!authReady ? (
            <Text style={styles.sheetDescription}>Sichere Sitzung wird geladen …</Text>
          ) : !isSupabaseConfigured ? (
            <>
              <Text style={styles.sheetTitle}>Verbindung fehlt</Text>
              <Text style={styles.sheetDescription}>
                Hinterlegen Sie die beiden EXPO_PUBLIC_SUPABASE-Werte in apps/mobile/.env.local.
              </Text>
            </>
          ) : !session ? (
            <>
              <Text style={styles.sheetTitle}>Sicher anmelden</Text>
              <Text style={styles.sheetDescription}>
                Ihre Fallakte ist privat und nur nach der Anmeldung erreichbar.
              </Text>
              <Text style={styles.fieldLabel}>E-Mail</Text>
              <BottomSheetTextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="name@beispiel.de"
                placeholderTextColor={colors.inkSoft}
                editable={!codeSent}
              />

              {authMode === "code" ? (
                <>
                  {codeSent ? (
                    <>
                      <Text style={styles.fieldLabel}>Code aus der E-Mail</Text>
                      <BottomSheetTextInput
                        style={[styles.input, styles.codeInput]}
                        value={code}
                        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        // Damit iOS den Code aus der Mail direkt ueber der
                        // Tastatur anbietet, statt ihn abtippen zu lassen.
                        textContentType="oneTimeCode"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        placeholderTextColor={colors.inkSoft}
                      />
                      <Pressable onPress={submitCode} disabled={!canVerifyCode}>
                        <View style={[styles.primaryAction, !canVerifyCode && styles.disabled]}>
                          <Image source={paper} style={styles.primaryActionGrain} resizeMode="cover" />
                          <Text style={styles.primaryActionLabel}>
                            {busy ? "Bitte warten …" : "Anmelden"}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={requestCode}
                        disabled={!canRequestCode}
                      >
                        <Text style={[styles.secondaryAction, !canRequestCode && styles.disabled]}>
                          {cooldown > 0 ? `Neuen Code in ${cooldown}s` : "Neuen Code senden"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setCodeSent(false);
                          setCode("");
                          setMessage("");
                        }}
                      >
                        <Text style={styles.secondaryAction}>Andere E-Mail verwenden</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={requestCode} disabled={!canRequestCode}>
                        <View style={[styles.primaryAction, !canRequestCode && styles.disabled]}>
                          <Image source={paper} style={styles.primaryActionGrain} resizeMode="cover" />
                          <Text style={styles.primaryActionLabel}>
                            {busy ? "Bitte warten …" : "Code anfordern"}
                          </Text>
                        </View>
                      </Pressable>
                      <Text style={styles.hint}>
                        Kein Passwort noetig. Wir schicken Ihnen einen sechsstelligen Code.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setCodeSent(true);
                          setMessage("");
                        }}
                        disabled={!emailLooksValid}
                      >
                        <Text style={[styles.secondaryAction, !emailLooksValid && styles.disabled]}>
                          Ich habe schon einen Code
                        </Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => setAuthMode("password")}>
                        <Text style={styles.secondaryAction}>Ich habe ein Passwort</Text>
                      </Pressable>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Passwort</Text>
                  <BottomSheetTextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    secureTextEntry
                    placeholder="Mindestens 8 Zeichen"
                    placeholderTextColor={colors.inkSoft}
                  />
                  <Pressable onPress={authenticate} disabled={!canAuthenticate}>
                    <View style={[styles.primaryAction, !canAuthenticate && styles.disabled]}>
                      <Image source={paper} style={styles.primaryActionGrain} resizeMode="cover" />
                      <Text style={styles.primaryActionLabel}>
                        {busy ? "Bitte warten …" : "Anmelden"}
                      </Text>
                    </View>
                  </Pressable>
                  {/* Kein "Konto anlegen" mehr: neue Konten entstehen ueber den
                      Code-Weg, damit niemand mehr ein Passwort setzen muss. */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAuthMode("code");
                      setPassword("");
                      setMessage("");
                    }}
                  >
                    <Text style={styles.secondaryAction}>Lieber Code per E-Mail</Text>
                  </Pressable>
                </>
              )}
            </>
          ) : (
            <>
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
              <Text style={styles.hint}>PDF, DOCX oder Bild · maximal 20 MB</Text>

              <Pressable onPress={beginCase} disabled={!canSubmit}>
                <View style={[styles.primaryAction, !canSubmit && styles.disabled]}>
                  <Image source={paper} style={styles.primaryActionGrain} resizeMode="cover" />
                  <Text style={styles.primaryActionLabel}>
                    {busy ? "Wird gespeichert …" : "Fall anlegen"}
                  </Text>
                </View>
              </Pressable>
            </>
          )}
          {message ? (
            <Text style={styles.message} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
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
  brandMarkText: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    color: colors.ink,
    includeFontPadding: false,
  },
  brandName: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 1.5,
    color: colors.ink,
    includeFontPadding: false,
  },
  brandClaim: { fontSize: 10, letterSpacing: 0.4, color: colors.inkSoft, marginTop: 3 },

  hero: { height: 214, marginTop: 10, alignItems: "center", justifyContent: "center" },
  heroImage: { width: 152, height: 212, opacity: 0.94 },
  // Luft unter der Zeichnung: der Ballonmann bekommt Raum nach unten, und der
  // Textblock samt Schritten rueckt als Ganzes nach.
  copy: { marginTop: 30, gap: 11 },

  register: { marginTop: 24 },
  registerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 11 },
  // Die Linie trennt, statt zu umranden: kein Kasten, nur der Registerschnitt.
  registerRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  registerLabel: {
    // Feste Spaltenbreite, damit die rechte Spalte ueber alle Zeilen fluchtet.
    // 98 statt 84: "WEITERGEHEN" ist das laengste Label und wuerde sonst umbrechen.
    width: 98,
    fontFamily: fonts.serif,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.accentDark,
    // Gleiche Zeilenhoehe wie rechts, sonst sitzt das Label eine Spur zu hoch.
    lineHeight: 19,
    includeFontPadding: false,
  },
  registerDetail: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.ink,
    includeFontPadding: false,
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
  caseCreatedMeta: { fontSize: 11, color: colors.inkSoft },

  // Bleibt unten am sicheren Rand, ohne feste Bildschirmhöhe anzunehmen.
  actions: { marginTop: "auto", paddingTop: 28 },
  // 48 statt 54: die gefuellte Flaeche ist das einzige Massiv auf einem Screen
  // aus Linien und Text und zog vorher mehr Blick als die Headline. 48 bleibt
  // deutlich ueber Apples 44pt-Mindestziel fuer Tap-Flaechen.
  //
  // Flache Tinte statt Verlauf: ein diagonaler Gradient ist App-Vokabular,
  // gedruckte Farbe hat keinen. overflow versteckt das Korn hinter dem Radius.
  primaryAction: {
    minHeight: 48,
    borderRadius: radius.action,
    backgroundColor: colors.accentDark,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 21,
  },
  // Dieselbe Papierstruktur wie der Hintergrund, schwach ueber die Farbe gelegt:
  // so wirkt die Flaeche wie auf das Blatt gedruckt statt darueber schwebend.
  primaryActionGrain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  // Gesetzt wie die Wortmarke und die Registerlabels: Georgia, Versalien,
  // gesperrt. Der Pfeil ist entfallen - er kam aus der Systemschrift und passte
  // zu keiner der beiden Schriften; "Fall beginnen" sagt die Richtung selbst.
  primaryActionLabel: {
    color: colors.onAccent,
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  disabled: { opacity: 0.42 },
  pressed: { transform: [{ translateY: 1 }] },
  privacyNote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: colors.inkSoft,
  },
  // Der Hinweis bleibt vollstaendig lesbar - kleiner zu setzen waere bei einem
  // Rechtsprodukt das falsche Signal. Nur der Abstand rueckt zusammen, damit
  // Fussnote und Hinweis als ein Block wirken statt als Warnung unter der Aktion.
  legalNote: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 11,
    color: colors.inkSoft,
  },
  signOut: {
    marginTop: 7,
    minHeight: 24,
    textAlign: "center",
    fontSize: 11,
    textDecorationLine: "underline",
    color: colors.inkSoft,
  },

  accountRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  accountSeparator: { fontSize: 11, color: colors.inkSoft },

  sheetBackground: { backgroundColor: colors.paper, borderRadius: radius.sheet },
  sheetHandle: { backgroundColor: "rgba(57, 55, 46, 0.24)", width: 42, height: 5 },
  sheetBody: { paddingHorizontal: 22, gap: 11 },
  sheetClose: {
    position: "absolute",
    right: 16,
    top: 0,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  sheetCloseGlyph: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.inkSoft,
    includeFontPadding: false,
  },
  sheetTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  sheetDescription: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginBottom: 3 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(49, 48, 40, 0.18)",
    borderRadius: radius.control,
    backgroundColor: "rgba(255, 253, 247, 0.64)",
    paddingHorizontal: 13,
    fontSize: 16,
    color: colors.ink,
  },
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
  codeInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: fonts.serif,
    includeFontPadding: false,
  },
  attachmentLabel: { fontSize: 13, fontWeight: "600", color: colors.accentDark },
  hint: { fontSize: 11, color: colors.inkSoft },
  secondaryAction: {
    minHeight: 44,
    paddingTop: 13,
    textAlign: "center",
    fontSize: 13,
    color: colors.accentDark,
    textDecorationLine: "underline",
  },
  message: { fontSize: 12, lineHeight: 18, color: colors.accentDark },
});
