// Starts (or reuses) the Vite dev server and prints the address the phone can
// reach it on. Vite already binds 0.0.0.0 via vite.config.ts, so the only thing
// missing for real-device testing was knowing where to point the phone.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { execFileSync } from "node:child_process";

const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

function lanAddress() {
  const candidates = [];

  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      // Thunderbolt/bridge interfaces answer but are not on the phone's network.
      if (name.startsWith("bridge") || name.startsWith("utun") || name.startsWith("llw")) continue;
      candidates.push({ name, address: entry.address });
    }
  }

  // Prefer the interface holding the default route.
  try {
    const route = execFileSync("route", ["-n", "get", "default"], { encoding: "utf8" });
    const iface = route.match(/interface:\s*(\S+)/)?.[1];
    const preferred = candidates.find((candidate) => candidate.name === iface);
    if (preferred) return preferred.address;
  } catch {
    // No default route (offline); fall through to the first candidate.
  }

  return candidates[0]?.address ?? null;
}

async function isServing(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function qrCode(url) {
  try {
    return execFileSync("qrencode", ["-t", "ANSIUTF8", "-m", "2", url], { encoding: "utf8" });
  } catch {
    return null;
  }
}

const address = lanAddress();

if (!address) {
  console.error("Keine LAN-Adresse gefunden – ist der Mac mit dem Netzwerk verbunden?");
  process.exit(1);
}

const deviceUrl = `http://${address}:${port}/`;

function announce() {
  const label = "Auf dem iPhone öffnen:";
  const width = Math.max(label.length, deviceUrl.length);
  const row = (text) => `│   ${text.padEnd(width)}   │`;
  const line = "─".repeat(width + 6);

  console.log(`\n┌${line}┐`);
  console.log(row(label));
  console.log(row(deviceUrl));
  console.log(`└${line}┘\n`);

  const qr = qrCode(deviceUrl);
  if (qr) {
    console.log(qr);
  } else {
    console.log("Tipp: `brew install qrencode` zeigt hier künftig einen QR-Code zum Abscannen.\n");
  }

  console.log("Das iPhone muss im selben Netz hängen (WLAN des Routers, der auch den Mac versorgt).");
  console.log("Debuggen per Kabel: iPhone → Einstellungen → Apps → Safari → Erweitert → Web-Inspector,");
  console.log("dann am Mac Safari → Entwickeln → <Gerätename> → die geöffnete Seite.\n");
}

if (await isServing(`http://127.0.0.1:${port}/`)) {
  console.log(`Dev-Server läuft bereits auf Port ${port} – kein zweiter wird gestartet.`);
  announce();
  process.exit(0);
}

announce();

const vite = spawn("npm", ["run", "dev", "--", "--port", String(port), "--strictPort"], {
  stdio: "inherit",
});

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));
vite.on("exit", (code) => process.exit(code ?? 0));
