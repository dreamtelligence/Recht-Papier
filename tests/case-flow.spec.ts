import { expect, test } from "@playwright/test";

// iPhone 14 Pro Max, the device this app is built for.
test.use({ viewport: { width: 430, height: 932 } });

test.describe("case flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the app fills the screen without the prototype device frame", async ({ page }) => {
    await expect(page.locator(".phone-device")).toHaveCount(0);
    await expect(page.locator(".paper-app")).toBeVisible();

    const gap = await page.evaluate(() => {
      const note = document.querySelector<HTMLElement>(".privacy-note")!;
      return window.innerHeight - note.getBoundingClientRect().bottom;
    });
    // Anchored near the bottom edge, clear of the home indicator.
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(60);
  });

  test("the sheet opens quietly and takes text only after a tap into the field", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();

    const textarea = page.getByLabel("Was ist passiert?");
    await expect(page.getByTestId("bottom-sheet")).toBeVisible();
    await expect(textarea).not.toBeFocused();

    await textarea.click();
    await page.keyboard.type("Ich habe eine Kündigung erhalten.");

    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveValue("Ich habe eine Kündigung erhalten.");
  });

  test("description plus attachment creates the case", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();
    await page.getByLabel("Was ist passiert?").fill("Ich habe eine Kündigung erhalten.");

    await expect(page.getByRole("button", { name: /Fall anlegen/ })).toBeDisabled();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Anschreiben hinzufügen" }).click();
    await (await chooser).setFiles({
      name: "kuendigung.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });

    await expect(page.getByRole("button", { name: "kuendigung.pdf" })).toBeVisible();
    await page.getByRole("button", { name: /Fall anlegen/ }).click();

    await expect(page.getByTestId("bottom-sheet")).toHaveCount(0);
    await expect(page.getByText("Ihr Fall ist angelegt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Fall ergänzen" })).toBeVisible();
  });

  test("the sheet closes by escape and by tapping the overlay", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();
    await expect(page.getByTestId("bottom-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bottom-sheet")).toHaveCount(0);

    await page.getByRole("button", { name: "Fall beginnen" }).click();
    await expect(page.getByTestId("bottom-sheet")).toBeVisible();
    await page.getByTestId("sheet-overlay").click({ position: { x: 20, y: 20 } });
    await expect(page.getByTestId("bottom-sheet")).toHaveCount(0);
  });
});
