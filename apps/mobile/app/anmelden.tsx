import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useSession } from "@/features/auth/session";
import { useAnmeldung } from "@/features/auth/useAnmeldung";
import {
  CodeField,
  Field,
  Message,
  Muted,
  PaperScrollScreen,
  PrimaryAction,
  SecondaryAction,
  Title,
} from "@/ui";
import { colors } from "@/theme";

/**
 * Die Anmeldung — die Tür zwischen Startbildschirm und App.
 *
 * Sie ist ein eigener Bildschirm und kein Bottom Sheet auf der Startseite.
 * Der Unterschied ist nicht optisch: ein Sheet gehört dem Bildschirm darunter,
 * und solange die Anmeldung dem Startbildschirm gehörte, musste dieser wissen,
 * ob jemand angemeldet ist, was er dann anzeigt und wohin er springt. Genau
 * daraus wurde die Startseite mit Fallakte darauf.
 *
 * Nach dem Erfolg passiert hier bewusst kein `router.replace`: der
 * `SessionProvider` meldet die neue Sitzung, der Guard in `app/_layout.tsx`
 * nimmt diesen Bildschirm aus dem Navigator und die App erscheint. Eine
 * Navigation von Hand wäre eine zweite Wahrheit neben dem Guard.
 */
export default function Anmelden() {
  const router = useRouter();
  const { konfiguriert } = useSession();
  const a = useAnmeldung();

  return (
    <PaperScrollScreen>
      {/* Ein sichtbarer Weg zurück. Nur auf die Wischgeste zu setzen lässt
          Leute festsitzen, die sie nicht kennen — und wer hier zögert, will
          oft genau das: erstmal wieder raus. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Schließen"
        hitSlop={14}
        onPress={() => router.back()}
        style={styles.schliessen}
      >
        <Text style={styles.schliessenZeichen}>×</Text>
      </Pressable>

      {!konfiguriert ? (
        <>
          <Title>Verbindung fehlt</Title>
          <Muted>
            Hinterlegen Sie die beiden EXPO_PUBLIC_SUPABASE-Werte in apps/mobile/.env.local.
          </Muted>
        </>
      ) : (
        <>
          <Title>Sicher anmelden</Title>
          <Muted>Ihre Fallakte ist privat und nur nach der Anmeldung erreichbar.</Muted>

          <View style={styles.formular}>
            <Field
              label="E-Mail"
              value={a.email}
              onChangeText={a.setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="name@beispiel.de"
              editable={a.schritt !== "code"}
            />

            {a.schritt === "code" ? (
              <>
                <CodeField value={a.code} onChangeText={a.setCode} />
                <PrimaryAction
                  label={a.beschaeftigt ? "Bitte warten …" : "Anmelden"}
                  onPress={a.bestaetigen}
                  disabled={!a.kannCodeBestaetigen}
                />
                <SecondaryAction
                  label={a.sperrfrist > 0 ? `Neuen Code in ${a.sperrfrist}s` : "Neuen Code senden"}
                  onPress={a.anfordern}
                  disabled={!a.kannCodeAnfordern}
                />
                <SecondaryAction
                  label="Andere E-Mail verwenden"
                  onPress={() => a.zuSchritt("email")}
                />
              </>
            ) : a.schritt === "passwort" ? (
              <>
                <Field
                  label="Passwort"
                  value={a.passwort}
                  onChangeText={a.setPasswort}
                  autoCapitalize="none"
                  autoComplete="password"
                  secureTextEntry
                  placeholder="Mindestens 8 Zeichen"
                />
                <PrimaryAction
                  label={a.beschaeftigt ? "Bitte warten …" : "Anmelden"}
                  onPress={a.mitPasswort}
                  disabled={!a.kannMitPasswort}
                />
                {/* Kein "Konto anlegen": neue Konten entstehen über den
                    Code-Weg, damit niemand mehr ein Passwort setzen muss. */}
                <SecondaryAction
                  label="Lieber Code per E-Mail"
                  onPress={() => a.zuSchritt("email")}
                />
              </>
            ) : (
              <>
                <PrimaryAction
                  label={a.beschaeftigt ? "Bitte warten …" : "Code anfordern"}
                  onPress={a.anfordern}
                  disabled={!a.kannCodeAnfordern}
                />
                <Muted>Kein Passwort nötig. Wir schicken Ihnen einen sechsstelligen Code.</Muted>
                <SecondaryAction
                  label="Ich habe ein Passwort"
                  onPress={() => a.zuSchritt("passwort")}
                />
              </>
            )}

            <Message>{a.meldung}</Message>
          </View>
        </>
      )}
    </PaperScrollScreen>
  );
}

const styles = StyleSheet.create({
  formular: { marginTop: 18, gap: 12 },
  schliessen: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  schliessenZeichen: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.inkSoft,
    includeFontPadding: false,
  },
});
