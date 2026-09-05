import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.edwit.rechtundpapier",
  appName: "Recht & Papier",
  webDir: "dist/client",
  ios: {
    // The app paints its own paper background behind the status bar via
    // safe-area insets, so the web view should own the full screen.
    contentInset: "never",
    backgroundColor: "#f4efe3",
  },
  server: {
    // Set CAP_LIVE_RELOAD to the Mac's dev-server URL (see npm run dev:device)
    // to run the installed app against Vite with hot reload instead of the
    // bundled build. Unset for a normal, self-contained build.
    url: process.env.CAP_LIVE_RELOAD || undefined,
    cleartext: Boolean(process.env.CAP_LIVE_RELOAD),
  },
};

export default config;
