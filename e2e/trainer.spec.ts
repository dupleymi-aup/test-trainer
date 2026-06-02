import { test, expect } from "@playwright/test";

test.describe("Trainer functionality", () => {
  test("should display task list", async ({ page }) => {
    await page.goto("/");
    // Tasks should be visible in the trainer tab
    await expect(page.getByRole("tablist")).toBeVisible();
  });

  test("should select and display a task", async ({ page }) => {
    await page.goto("/");
    // Click on the first task card button (tasks have accessible names)
    const firstTask = page.getByRole("button", { name: /задание|task|№/i }).first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();
    // Task workspace should appear
    await expect(page.getByRole("main")).toBeVisible();
  });
});
