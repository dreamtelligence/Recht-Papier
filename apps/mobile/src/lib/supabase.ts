import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url ?? "https://not-configured.invalid",
  key ?? "not-configured",
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Den Auffrischungs-Timer an den Lebenszyklus der App hängen.
 *
 * `autoRefreshToken: true` allein reicht auf React Native nicht: der Timer
 * läuft auf einem Interval, und der steht still, während die App im
 * Hintergrund ist. Ohne diese beiden Zeilen kommt jemand nach ein paar Stunden
 * zurück, das Token ist abgelaufen, der Guard in `app/_layout.tsx` fällt auf
 * `false` — und der Bildschirm springt kommentarlos auf den Start. Es sieht
 * aus wie ein Rauswurf und ist ein vergessener Wecker.
 *
 * Auf Web gibt es keinen App-Zustand in diesem Sinn; dort erledigt der Browser
 * das Anhalten selbst.
 */
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (zustand) => {
    if (zustand === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
