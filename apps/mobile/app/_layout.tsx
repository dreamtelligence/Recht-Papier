import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { colors } from "../theme";

// Der native Startbildschirm bleibt stehen, bis der Bildschirm sein erstes Bild
// gezeichnet hat. Ohne das blitzt zwischen Splash und App kurz Weiss auf.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Kann fehlschlagen, wenn der Splash bereits weg ist. Kein Grund abzubrechen.
});

export default function RootLayout() {
  useEffect(() => {
    // Sicherheitsnetz: falls der Bildschirm den Splash nicht selbst schliesst,
    // haengt die App nicht dauerhaft im Startbild fest.
    const rescue = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(rescue);
  }, []);

  return (
    // Der Gesture-Handler muss die Wurzel sein, sonst nimmt das Fall-Sheet
    // keine Wischgesten an.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        {/* Dunkle Symbole auf hellem Papier. */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
