import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { SessionProvider, useSession } from "@/features/auth/session";
import { colors } from "@/theme";

// Der native Startbildschirm bleibt stehen, bis feststeht, wohin die App
// gehört. Ohne das blitzt beim Start kurz der Startbildschirm auf, obwohl
// jemand angemeldet ist — und das ist genau der Eindruck, den eine App nicht
// machen darf: dass sie erst nachdenken muss, wer da vor ihr steht.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Kann fehlschlagen, wenn der Splash bereits weg ist. Kein Grund abzubrechen.
});

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
