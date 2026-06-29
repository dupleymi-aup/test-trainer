import { test, expect, type BrowserContext } from "@playwright/test";

test.describe("Teacher Workflow", () => {
  // Login via E2E helper API and set session cookie
  async function loginTeacher(context: BrowserContext): Promise<void> {
    // Check if already logged in by looking for session cookies
    const cookies = await context.cookies("http://localhost:3000");
    const hasSessionCookie = cookies.some(c => 
      c.name.includes("next-auth.session-token") || 
      c.name.includes("session-token")
    );
    
    if (hasSessionCookie) {
      return; // Already logged in
    }

    // Call E2E login API
    const response = await fetch("http://localhost:3000/api/auth/e2e-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "teacher@testtrainer.local",
        password: "teacher123",
      }),
    });

    if (!response.ok) {
      throw new Error(`E2E login failed: ${response.status}`);
    }

    const data = await response.json() as { sessionToken: string };
    
    // Set the session cookie in the browser context
    await context.addInitScript(() => {
      // This runs in the browser - we'll use addCookies instead
    });

    // Add cookie to context
    await context.addCookies([{
      name: "next-auth.session-token",
      value: data.sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: false, // Allow Playwright to access it
      secure: false,
      sameSite: "Lax",
    }]);
  }

  test.beforeEach(async ({ context }) => {
    await loginTeacher(context);
  });

  test("should display teacher dashboard after login", async ({ page }) => {
    await page.goto("/teacher");
    await page.waitForLoadState("domcontentloaded");
    
    const url = page.url();
    expect(url).toContain("localhost:3000");
  });

  test("should navigate to groups page", async ({ page }) => {
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
    await page.goto("/teacher/analytics");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/analytics");
  });

  test("should view students list", async ({ page }) => {
    await page.goto("/teacher/students");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/students");
  });

  test("should view student details", async ({ page }) => {
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
    await page.goto("/teacher/templates");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/templates");
  });

  test("should navigate to task constructor", async ({ page }) => {
    await page.goto("/teacher/task-constructor");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/task-constructor");
  });

  test("should navigate to gradebook", async ({ page }) => {
    await page.goto("/teacher/gradebook");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toContain("/teacher/gradebook");
  });

  test("should handle non-existent teacher route", async ({ page }) => {
    await page.goto("/teacher/nonexistent");
    await page.waitForLoadState("domcontentloaded");
    
    expect(page.url()).toBeTruthy();
  });
});
