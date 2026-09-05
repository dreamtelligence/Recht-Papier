import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";

// The address the phone can reach this Mac on. Vite also advertises link-local
// (169.254.x) and bridge interfaces, which the phone cannot route to, so prefer
// whichever interface carries the default route.
export function lanAddress() {
  const candidates = [];

  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (name.startsWith("bridge") || name.startsWith("utun") || name.startsWith("llw")) continue;
      candidates.push({ name, address: entry.address });
    }
  }

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
