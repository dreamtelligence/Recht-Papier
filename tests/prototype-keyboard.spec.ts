import { expect, test } from "@playwright/test";

const bottomGap = () =>
  document.querySelector<HTMLElement>('[data-testid="device-screen"]')!.getBoundingClientRect().bottom -
  document.querySelector<HTMLElement>(".privacy-note")!.getBoundingClientRect().bottom;

test.describe("case sheet keyboard state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the sheet opens quietly and raises the keyboard only on a tap into the field", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();

    await expect(page.getByTestId("bottom-sheet")).toBeVisible();
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");
    await expect(page.getByLabel("Was ist passiert?")).not.toBeFocused();
    // The suppressed auto-focus must not bounce back once the sheet has settled.
    await page.waitForTimeout(600);
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");

    await page.getByLabel("Was ist passiert?").click();

    await expect(page.getByLabel("Was ist passiert?")).toBeFocused();
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "true");
  });

  test("closing the sheet dismisses the keyboard and restores the bottom action", async ({ page }) => {
    const restingGap = await page.evaluate(bottomGap);

    await page.getByRole("button", { name: "Fall beginnen" }).click();
    const textarea = page.getByLabel("Was ist passiert?");
    await textarea.click();
    await page.keyboard.type("Ich habe eine Kündigung erhalten.");
    await expect(textarea).toHaveValue("Ich habe eine Kündigung erhalten.");
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "true");

    await page.keyboard.press("Escape");

    await expect(page.getByTestId("bottom-sheet")).toHaveCount(0);
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");
    await expect.poll(() => page.evaluate(bottomGap)).toBeCloseTo(restingGap, 0);
  });

  test("losing text focus inside the sheet dismisses the keyboard", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();
    await page.getByLabel("Was ist passiert?").click();
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "true");

    await page.getByText("Worum geht es?").click();

    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");
    await expect(page.getByTestId("bottom-sheet")).toBeVisible();
  });

  test("sheet controls stay tappable while the keyboard is open", async ({ page }) => {
    await page.getByRole("button", { name: "Fall beginnen" }).click();
    const textarea = page.getByLabel("Was ist passiert?");
    await textarea.click();
    await page.keyboard.type("Ich habe eine Kündigung erhalten.");
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "true");

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Anschreiben hinzufügen" }).click();
    await (await chooser).setFiles({ name: "kuendigung.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });

    await expect(page.getByRole("button", { name: "kuendigung.pdf" })).toBeVisible();
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");
    await expect(page.getByRole("button", { name: /Fall anlegen/ })).toBeEnabled();
  });
});
