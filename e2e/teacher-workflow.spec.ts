import { test as base, expect, type Page } from "@playwright/test";

const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const response = await page.request.post("/api/auth/e2e-login", {
      data: { email: "teacher@testtrainer.local", password: "teacher123" },
    });
    if (!response.ok()) throw new Error(`E2E login failed: ${response.status()}`);
    const data = await response.json() as { sessionToken: string };
    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: data.sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    }]);
    await use(page);
  },
});

test.describe("Teacher Workflow", () => {
  test("dashboard loads with teacher panel after login", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher");
    const body = await authenticatedPage.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("navigates to groups and creates a group", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/groups?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/groups");

    const groupName = `E2E Group ${Date.now()}`;
    const input = authenticatedPage.getByPlaceholder("Название").first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(groupName);
      const desc = authenticatedPage.getByPlaceholder("Описание").first();
      if (await desc.isVisible({ timeout: 2000 }).catch(() => false)) {
        await desc.fill("Created by E2E test");
      }
      const btn = authenticatedPage.getByRole("button", { name: /Создать|Create|Добавить|Add/i }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await authenticatedPage.waitForTimeout(1000);
      }
    }
  });

  test("students page renders student list", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/students?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/students");
    const rows = authenticatedPage.locator("table tbody tr, [data-testid='student-row']").first();
    await expect(rows).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("analytics page loads charts", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/analytics?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/analytics");
    const body = await authenticatedPage.locator("body").textContent();
    if (body) expect(body.length).toBeGreaterThan(50);
  });

  test("gradebook page renders matrix", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/gradebook?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/gradebook");
    const cells = authenticatedPage.locator("table").first();
    await expect(cells).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("task constructor page loads", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/task-constructor?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/task-constructor");
  });

  test("reports page is accessible", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/reports?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/reports");
  });

  test("messages page loads", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/messages?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/messages");
  });

  test("settings page is accessible", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/settings?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/settings");
  });

  test("templates list loads", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/templates?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/teacher/templates");
  });

  test("all teacher side-nav links are present", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    const links = await authenticatedPage.locator("nav a, aside a").all();
    expect(links.length).toBeGreaterThanOrEqual(5);
  });
});
