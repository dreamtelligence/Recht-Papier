import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { SessionProvider, useSession } from "@/features/auth/session";
import { Muted, PaperScreen, PrimaryAction, Title } from "@/ui";
import { colors } from "@/theme";

// Der native Startbildschirm bleibt stehen, bis feststeht, wohin die App
// gehört. Ohne das blitzt beim Start kurz der Startbildschirm auf, obwohl
// jemand angemeldet ist — und das ist genau der Eindruck, den eine App nicht
// machen darf: dass sie erst nachdenken muss, wer da vor ihr steht.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Kann fehlschlagen, wenn der Splash bereits weg ist. Kein Grund abzubrechen.
});

/**
 * Was passiert, wenn ein Bildschirm beim Rendern abstürzt.
 *
 * Expo Router erkennt diesen Export im Wurzel-Layout und fängt damit jeden
 * Renderfehler der ganzen App ab. Ohne ihn zeigt ein Produktions-Build eine
 * weiße Fläche — die App ist dann nicht kaputt, sie ist weg, und der Nutzer
 * hat keinen Weg zurück außer Neustart. Bei einer Rechtsakte mit laufender
 * Frist ist das der schlechtestmögliche Moment.
 *
 * Der Text nennt bewusst weder Fehlermeldung noch Stack: beide können
 * Falldaten enthalten, und der Nutzer kann mit keinem von beidem etwas
 * anfangen. Was er braucht, ist ein Knopf.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Solange keine Absturzmeldung angeschlossen ist, ist die
    // Entwicklerkonsole der einzige Ort, an dem dieser Fehler auftaucht.
    // Genau deshalb gehört ein Dienst dafür in die Release-Vorbereitung.
    if (__DEV__) console.error("Renderfehler:", error);
  }, [error]);

  return (
    <PaperScreen>
      <View style={{ flex: 1, justifyContent: "center", gap: 14 }}>
        <Title>Da ist etwas schiefgegangen</Title>
        <Muted>
          Ihre Fallakte ist unversehrt — sie liegt auf dem Server, nicht in dieser Ansicht.
          Versuchen Sie es bitte erneut.
        </Muted>
        <PrimaryAction label="Erneut versuchen" onPress={() => void retry()} />
      </View>
    </PaperScreen>
  );
}

export default function RootLayout() {
  return (
    // Der Gesture-Handler muss die Wurzel sein, sonst nimmt keine Fläche
    // darunter Wischgesten an.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        {/* Dunkle Symbole auf hellem Papier. */}
        <StatusBar style="dark" />
        <SessionProvider>
          <SplashSteuerung />
          <RootNavigator />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Die einzige Weiche der App.
 *
 * `Stack.Protected` ist hier nicht nur bequemer als ein `Redirect` in jedem
 * Layout, sondern strenger: eine Route, deren Guard auf `false` fällt, wird
 * samt ihrer Historie aus dem Navigator entfernt. Nach dem Abmelden führt
 * also kein Zurück-Wisch mehr in die Fallakte — bei einem Rechtsprodukt auf
 * einem geteilten Gerät ist das der Unterschied zwischen "ausgeloggt" und
 * "sieht ausgeloggt aus".
 *
 * Die Reihenfolge ist Absicht: fällt die aktuelle Route weg, landet der Router
 * auf dem ersten erreichbaren Bildschirm. Angemeldet ist das `(app)`, sonst
 * `start`.
 */
function RootNavigator() {
  const { angemeldet } = useSession();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Protected guard={angemeldet}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!angemeldet}>
        <Stack.Screen name="start" />
        <Stack.Screen name="anmelden" options={{ presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Gibt den nativen Splash frei, sobald die gespeicherte Sitzung gelesen ist.
 *
 * Der Zeitpunkt ist bewusst nicht "erster Bildschirm gezeichnet": bis die
 * Sitzung feststeht, wäre das der falsche Bildschirm.
 */
function SplashSteuerung() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unbekannt") return;
    SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  useEffect(() => {
    // Sicherheitsnetz: antwortet Supabase gar nicht, hängt die App sonst
    // dauerhaft im Startbild fest.
    const rettung = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(rettung);
  }, []);

  return null;
}
