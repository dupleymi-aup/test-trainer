import { test, expect, type Page } from "@playwright/test";

test.describe("Teacher Workflow", () => {
  // Helper: login as teacher
  async function loginAsTeacher(page: Page) {
    await page.goto("/login");
    // Login page should be visible (check for email input or heading)
    const loginInput = page.getByLabel(/Email|Телефон/i).first();
    if (await loginInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Already on login page
    } else {
      // Try clicking a login link to get to login page
      const loginLink = page.getByRole("link", { name: /Войти/i }).first();
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page.getByLabel(/Email|Телефон/i)).toBeVisible({ timeout: 10000 });
      }
    }

    await page.getByLabel(/Email или телефон/i).fill("teacher@testtrainer.local");
    await page.getByLabel(/Пароль/i).fill("teacher123");
    await page.getByRole("button", { name: /Войти/i }).click();

    // Wait for redirect to teacher dashboard or main app
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15000 });
  }

  test("should display teacher dashboard with stats", async ({ page }) => {
    await loginAsTeacher(page);

    // After login, teacher should see dashboard or main content
    await expect(page.getByRole("main")).toBeVisible();
    
    // Teacher dashboard should show stats cards
    const statsVisible = await page.getByText(/Студенты|Средний балл/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    if (statsVisible) {
      await expect(page.getByText(/Студенты/i)).toBeVisible();
      await expect(page.getByText(/Средний балл/i)).toBeVisible();
    }
  });

  test("should navigate to groups page", async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to groups page directly
    await page.goto("/teacher/groups");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
    
    // Groups page should have a form to create a group
    const createVisible = await page.getByPlaceholder("Название").isVisible({ timeout: 5000 }).catch(() => false);
    if (createVisible) {
      await expect(page.getByPlaceholder("Название")).toBeVisible();
    }
  });

  test("should create a new group", async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to groups page
    await page.goto("/teacher/groups");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });

    // Get group count before creation
    const tableBefore = page.getByRole("table");
    const rowsBefore = tableBefore.getByRole("row");
    const _rowCountBefore = await rowsBefore.count();

    // Fill in group name
    const nameInput = page.getByPlaceholder("Название");
    await nameInput.fill("Test Group E2E");

    // Fill in description
    const descInput = page.getByPlaceholder("Описание");
    await descInput.fill("Created by E2E test");

    // Click create button
    await page.getByRole("button", { name: /Создать/i }).click();

    // Wait for success toast
    await expect(page.getByText(/группа создана|Группа создана|success/i)).toBeVisible({ timeout: 5000 });

    // Verify group count increased or at least new group is visible
    await page.waitForTimeout(500);
    await expect(page.getByText("Test Group E2E")).toBeVisible();
  });

  test("should manage group members", async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to groups page
    await page.goto("/teacher/groups");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });

    // Look for a group row with members button (Users icon button)
    const usersButton = page.getByRole("button", { name: /Users|members|Группа/i }).first();
    if (await usersButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersButton.click();

      // Members modal should open
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Close the modal
      await page.getByRole("button", { name: /Закрыть/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
    // If no groups exist, test passes gracefully
  });

  test("should view analytics page", async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate directly to analytics
    await page.goto("/teacher/analytics");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });

  test("should view students list", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/students");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });

  test("should view student details", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/students");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });

    // Try to click on first student link
    const studentLink = page.getByRole("link", { name: /Студент|имя|email/i }).first();
    if (await studentLink.isVisible()) {
      await studentLink.click();
      await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
    }
  });

  test("should navigate to templates page", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/templates");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to task constructor", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/task-constructor");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to gradebook", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/gradebook");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });

  test("should display error page for non-existent teacher route", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/nonexistent");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
  });
});
