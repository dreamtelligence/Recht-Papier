import { reportHtml } from "../packages/shared/report.ts";
import { validateResult } from "../supabase/functions/_shared/portfolio-validation.ts";
const examples = JSON.parse(await Deno.readTextFile("apps/mobile/src/features/portfolio/demo-data.json"));
for (const example of examples) {
  if (!example.fictional || !/^dev-\d{2}$/.test(example.id)) throw new Error("Only curated fictional examples can be published");
  validateResult(example.result);
  await Deno.writeTextFile(`apps/mobile/public/portfolio/${example.id}-report.html`, reportHtml(example.result));
}
console.log(`${examples.length} stored results rendered; no analysis calls.`);
