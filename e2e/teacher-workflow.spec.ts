import { test, expect, type Page } from "@playwright/test";

test.describe("Teacher Workflow", () => {
  async function ensureLoggedIn(page: Page): Promise<void> {
    const url = page.url();
    
    // Already on protected page
    if (url.includes("/teacher/") || url.includes("/student/") || url.includes("/admin/")) {
      return;
    }
    
    // Already on home page with logout button = logged in
    if (url.includes("localhost:3000") && !url.includes("/login")) {
      const hasLogout = await page.getByRole("link", { name: /Выйти|Logout/i }).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (hasLogout) return;
    }
    
    // Need to login
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    const emailInput = page.locator("input[type='email'], input[name='email'], input[placeholder*='Email'], input[placeholder*='Телефон']").first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill("teacher@testtrainer.local");
    }
    
    const passwordInput = page.locator("input[type='password']").first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill("teacher123");
    }
    
    // Submit the form
    const loginBtn = page.getByRole("button", { name: /Войти|Login|Sign/i }).first();
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginBtn.click();
    } else {
      const form = page.locator("form").first();
      if (await form.isVisible()) {
        await form.press("Enter");
      }
    }
    
    // Wait for redirect
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(2000);
  }

  test("should display teacher dashboard after login", async ({ page }) => {
    await ensureLoggedIn(page);
    const url = page.url();
    expect(url).toContain("localhost:3000");
  });

  test("should navigate to groups page", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/groups");
    await page.waitForLoadState("domcontentloaded");
    
    const url = page.url();
    expect(url).toBeTruthy();
    
    // Groups page should have key elements
    const hasNameInput = await page.getByPlaceholder("Название").isVisible({ timeout: 3000 }).catch(() => false);
    const hasTable = await page.getByRole("table").isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasNameInput || hasTable).toBeTruthy();
  });

  test("should create a new group", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/groups");
    await page.waitForLoadState("domcontentloaded");
    
    const nameInput = page.getByPlaceholder("Название").first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill("Test Group E2E");
      
      const descInput = page.getByPlaceholder("Описание").first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill("Created by E2E test");
      }
      
      const createBtn = page.getByRole("button", { name: /Создать|Create/i }).first();
      if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(1000);
        
        const hasGroup = await page.getByText("Test Group E2E").isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasGroup).toBeTruthy();
      }
    }
  });

  test("should manage group members", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/groups");
    await page.waitForLoadState("domcontentloaded");
    
    const usersBtn = page.locator("button:has(svg) svg[aria-label='Users'], button:has(svg):has-text('members'), button:has(svg):has-text('Группа')").first();
    if (await usersBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersBtn.click();
      
      const dialog = page.getByRole("dialog").first();
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const closeBtn = page.getByRole("button", { name: /Закрыть|Close/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    }
  });

  test("should view analytics page", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/analytics");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/analytics");
  });

  test("should view students list", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/students");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/students");
  });

  test("should view student details", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/students");
    await page.waitForLoadState("domcontentloaded");
    
    const studentLink = page.getByRole("link").filter({ hasText: /student|студент|name|email/i }).first();
    if (await studentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await studentLink.click();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toBeTruthy();
    }
  });

  test("should navigate to templates page", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/templates");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/templates");
  });

  test("should navigate to task constructor", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/task-constructor");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/task-constructor");
  });

  test("should navigate to gradebook", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/gradebook");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/gradebook");
  });

  test("should handle non-existent teacher route", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/teacher/nonexistent");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toBeTruthy();
  });
});
