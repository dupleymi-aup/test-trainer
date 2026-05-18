import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TestTrainer/);
  });

  test("should display the main heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should show navigation elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation")).toBeVisible();
  });
});
