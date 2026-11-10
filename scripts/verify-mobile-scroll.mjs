/** Real browser input catches document scroll locks that locator auto-scroll hides. */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const root = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const base = process.env.DEMO_URL || "http://127.0.0.1:3291";
const out = root + "/docs/portfolio/presentation";
await fs.mkdir(out, { recursive: true });
const results = [];
for (const engine of ["chromium", "webkit"]) {
  const browser = await (engine === "chromium" ? chromium : webkit).launch({
    headless: true,
    ...(engine === "chromium" && process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    for (const width of [390, 430]) {
      // Playwright cannot wheel in mobile WebKit: use its actual engine at phone width.
      const page = await browser.newPage({
        viewport: { width, height: 844 },
        isMobile: engine === "chromium",
        hasTouch: engine === "chromium",
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto(base);
      await page.locator("h1").waitFor();
      const session = engine === "chromium"
        ? await page.context().newCDPSession(page)
        : null;
      async function scroll(down = true) {
        if (session) {
          const x = Math.round(width / 2),
            from = down ? 720 : 230,
            to = down ? 230 : 720;
          await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y: from }],
          });
          for (let step = 1; step <= 12; step++) {
            await session.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{
                x,
                y: Math.round(from + (to - from) * step / 12),
              }],
            });
            await page.waitForTimeout(20);
          }
          await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        } else {
          await page.mouse.move(width / 2, 600);
          await page.mouse.wheel(0, down ? 650 : -650);
        }
        await page.waitForTimeout(160);
      }
      await scroll();
      const first = await page.evaluate(() => scrollY);
      assert(
        first > 120,
        `${engine}/${width}: a normal scroll gesture left the page at ${first}px`,
      );
      await page.screenshot({
        path: `${out}/${engine}-${width}-after-scroll.png`,
      });
      await scroll(false);
      assert(
        await page.evaluate(() => scrollY) < first - 60,
        `${engine}/${width}: reverse scrolling is blocked`,
      );
      let reachedFooter = false;
      for (let i = 0; i < 65; i++) {
        if (
          await page.locator("footer").evaluate((el) =>
            el.getBoundingClientRect().bottom <= innerHeight + 3
          )
        ) {
          reachedFooter = true;
          break;
        }
        await scroll();
      }
      assert(
        reachedFooter,
        `${engine}/${width}: footer was not reachable with ordinary scroll input`,
      );
      assert(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
        `${engine}/${width}: horizontal overflow`,
      );
      assert.deepEqual(errors, []);
      results.push({
        engine,
        width,
        input: session
          ? "CDP trusted touch swipe"
          : "browser wheel at phone viewport",
        initial_scroll_y: first,
        reverse_scroll: true,
        footer_reached: true,
        page_errors: errors,
      });
      console.log(`${engine} ${width}px: scroll, reverse and footer passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
await fs.writeFile(
  `${out}/scroll-${
    base.startsWith("https:") ? "live" : "local"
  }-verification.json`,
  JSON.stringify(
    {
      executed_at: new Date().toISOString(),
      url: base,
      results,
      limit: "Browser emulation and WebKit engine; no physical iPhone test.",
    },
    null,
    2,
  ) + "\n",
);
