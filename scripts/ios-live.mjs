// Points the installed iOS app at this Mac's dev server, so the app on the
// phone hot-reloads while you edit instead of needing a rebuild per change.
// Run `npm run ios:bundled` to put the self-contained build back.
import { execFileSync } from "node:child_process";
import { lanAddress } from "./lan-address.mjs";

const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const address = lanAddress();

if (!address) {
  console.error("Keine LAN-Adresse gefunden – ist der Mac mit dem Netzwerk verbunden?");
  process.exit(1);
}

const url = `http://${address}:${port}`;
console.log(`App wird auf ${url} gezeigt (Live-Reload).`);

execFileSync("npx", ["cap", "sync", "ios"], {
  stdio: "inherit",
  env: { ...process.env, CAP_LIVE_RELOAD: url },
});

console.log(`\nJetzt in Xcode auf das iPhone starten. Der Dev-Server muss laufen: npm run dev:device ${port}`);
