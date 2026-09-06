import { Stack } from "expo-router";

import { colors } from "@/theme";

/**
 * Die App hinter der Anmeldung.
 *
 * Hier steht keine Anmeldeprüfung mehr. Sie sitzt eine Ebene höher im
 * `Stack.Protected` von `app/_layout.tsx`, und zwar aus einem Grund: eine
 * Prüfung, die *hier* stünde, würde diesen Bildschirm erst aufbauen und dann
 * wegleiten — sichtbar als kurzes Aufblitzen der Akte. Der Guard oben lässt
 * die Gruppe gar nicht erst entstehen.
 *
 * Sicherheit ist beides nicht. Die liegt in der Row Level Security: ohne
 * gültiges Token liefert die Datenbank nichts, egal welcher Bildschirm fragt.
 *
 * Kein Tab-Bar: MVP 1 hat genau ein echtes Objekt, die Fallakte. Zwei Tabs,
 * von denen einer "Konto" heißt, wären Navigation um der Navigation willen.
 * Sobald ein zweiter gleichrangiger Bereich dazukommt — Schreiben, Fristen —
 * ist das hier die Stelle, an der er entsteht.
 */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="fall/[id]" />
      {/* Die Vorschau auf ein Schreiben blättert weiter statt zu unterbrechen:
          sie gehört zur Akte, und der Weg zurück führt genau dorthin. */}
      <Stack.Screen name="schreiben/[id]" />
      {/* Ein neuer Fall ist eine Unterbrechung, kein Weiterblättern: er kommt
          von unten und geht dorthin zurück, wo man war. */}
      <Stack.Screen name="fall/neu" options={{ presentation: "modal" }} />
      <Stack.Screen name="konto" options={{ presentation: "modal" }} />
      {/* Nachschlagen ist eine Unterbrechung wie das Konto: man kommt
          zurück, wo man war, statt tiefer in einen Stapel zu laufen. */}
      <Stack.Screen name="nachschlagen" options={{ presentation: "modal" }} />
    </Stack>
  );
}
