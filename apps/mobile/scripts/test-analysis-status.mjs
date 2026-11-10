import assert from "node:assert/strict";
import { analyseLaeuft } from "../src/features/faelle/analyse-status.ts";
const now = Date.parse("2026-11-10T10:00:00Z");
assert(analyseLaeuft({status:"in_pruefung",run_expires_at:"2026-11-10T10:25:00Z"},now));
assert(!analyseLaeuft({status:"in_pruefung",run_expires_at:"2026-11-10T09:59:00Z"},now));
assert(!analyseLaeuft({status:"in_pruefung",run_expires_at:null},now));
assert(!analyseLaeuft({status:"analysiert",run_expires_at:"2026-11-10T10:25:00Z"},now));
console.log("Analysis lease status checks passed");
