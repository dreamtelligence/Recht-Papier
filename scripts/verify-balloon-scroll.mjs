import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const base = process.env.DEMO_URL || "http://127.0.0.1:3291";
const errors = [];

async function checkProgress(page) {
  await page.waitForFunction(() => {
    const range = document.documentElement.scrollHeight - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 1;
    const hidden = parseFloat(getComputedStyle(
      document.querySelector(".balloon-progress"),
    ).clipPath.match(/inset\(([^%]+)/)?.[1]);
    return Math.abs(hidden - (1 - progress) * 100) < 0.1;
  });
}

try {
  const page = await browser.newPage({
    viewport: { width: 1856, height: 900 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(base);
  await page.locator(".balloon-mark img").first().evaluate((img) => img.decode());
  assert.equal(await page.locator(".balloon-outline").evaluate((el) =>
    getComputedStyle(el).opacity
  ), "0.18");
  const top = await page.locator(".balloon-mark").evaluate((el) =>
    el.getBoundingClientRect().top
  );
  for (const fraction of [0, 0.25, 0.5, 0.75, 1, 0.5, 0]) {
    await page.evaluate((fraction) => scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * fraction,
      behavior: "instant",
    }), fraction);
    await checkProgress(page);
    if (fraction > 0) {
      await page.waitForFunction(() => {
        const image = document.querySelector(".balloon-progress");
        return image.complete && image.naturalWidth > 0;
      });
    }
    assert.equal(await page.locator(".balloon-mark").evaluate((el) =>
      el.getBoundingClientRect().top
    ), top);
  }
  await page.locator(".case-card").first().click();
  await page.locator("#walkthrough").waitFor();
  await checkProgress(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await checkProgress(page);
  assert.equal(await page.locator(".balloon-mark").evaluate((el) =>
    getComputedStyle(el).animationName
  ), "none");

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  mobile.on("pageerror", (error) => errors.push(String(error)));
  await mobile.goto(base);
  await mobile.locator(".balloon-mark").waitFor({ state: "attached" });
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: 195, y: 720 }],
  });
  for (let step = 1; step <= 12; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: Math.round(720 - 490 * step / 12) }],
    });
    await mobile.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert(await mobile.evaluate(() => scrollY > 120));
  await checkProgress(mobile);
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log("Balloon fill follows scrolling, reverse scrolling, content changes, resize and touch; reduced motion stays still.");
} finally {
  await browser.close();
}
