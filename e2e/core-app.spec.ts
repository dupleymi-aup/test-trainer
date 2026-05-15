import { test, expect } from "@playwright/test";

test.describe("Core App", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Тренажёр/);
  });

  test("trainer page shows tasks", async ({ page }) => {
    await page.goto("/");
    // Check that tasks list is visible
    await expect(page.getByText(/задач/)).toBeVisible();
  });

  test("exam mode setup is accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Экзамен/)).toBeVisible();
  });

  test("theory panel has content", async ({ page }) => {
    await page.goto("/");
    // Navigate to theory tab
    await page.getByRole("tab", { name: /Теория/ }).click();
    await expect(page.getByText(/Классы эквивалентности/)).toBeVisible();
  });
});
