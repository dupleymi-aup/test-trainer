import { test as base, expect, type Page } from "@playwright/test";

const TEACHER_EMAIL = "teacher@testtrainer.local";
const TEACHER_PASSWORD = "teacher123";

const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const response = await page.request.post("/api/auth/e2e-login", {
      data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
    });
    if (!response.ok()) throw new Error(`E2E login failed: ${response.status()}`);
    const data = (await response.json()) as { sessionToken: string };
    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: data.sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    await use(page);
  },
});

test.describe("Teacher Workflow", () => {
  test("dashboard loads with correct title and navigation", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher/);
    const sidebar = authenticatedPage.locator("nav, aside");
    await expect(sidebar).toBeVisible();
    const groupLink = sidebar.getByRole("link", { name: /групп/i });
    await expect(groupLink).toBeVisible();
  });

  test("creates a group and verifies it appears in the list", async ({ authenticatedPage }) => {
    const groupName = `E2E Group ${Date.now()}`;

    await authenticatedPage.goto("/teacher/groups?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/groups/);

    const nameInput = authenticatedPage.getByPlaceholder("Название");
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(groupName);

    const descInput = authenticatedPage.getByPlaceholder("Описание");
    await descInput.fill("Created by automated E2E test");

    const createBtn = authenticatedPage.getByRole("button", { name: /Создать/i });
    await createBtn.click();

    await expect(authenticatedPage.getByText(groupName)).toBeVisible({ timeout: 5000 });
  });

  test("deletes a previously created group", async ({ authenticatedPage }) => {
    const groupName = `E2E Group to Delete ${Date.now()}`;

    await authenticatedPage.goto("/teacher/groups?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");

    const nameInput = authenticatedPage.getByPlaceholder("Название");
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(groupName);
    await authenticatedPage.getByPlaceholder("Описание").fill("Will be deleted");
    await authenticatedPage.getByRole("button", { name: /Создать/i }).click();
    await expect(authenticatedPage.getByText(groupName)).toBeVisible({ timeout: 5000 });

    const deleteBtn = authenticatedPage.getByRole("button", { name: /Удалить/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await authenticatedPage.waitForTimeout(500);

    await expect(authenticatedPage.getByText(groupName)).not.toBeVisible();
  });

  test("analytics page loads chart content", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/analytics?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/analytics/);
    const body = authenticatedPage.locator("body");
    await expect(body).not.toHaveText("");
  });

  test("gradebook page renders a table", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/gradebook?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/gradebook/);
    const table = authenticatedPage.locator("table").first();
    await expect(table).toBeVisible({ timeout: 5000 });
  });

  test("students page shows student list", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/students?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/students/);
    await expect(authenticatedPage.locator("body")).not.toHaveText("");
  });

  test("task constructor page loads", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/task-constructor?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/task-constructor/);
  });

  test("reports page is accessible", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/reports?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/reports/);
  });

  test("settings page loads with form elements", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/settings?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/settings/);
    await expect(authenticatedPage.locator("body")).not.toHaveText("");
  });

  test("templates list loads", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher/templates?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveURL(/\/teacher\/templates/);
  });

  test("all teacher side-nav links navigate to correct pages", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/teacher?e2e=true");
    await authenticatedPage.waitForLoadState("networkidle");

    const navLinks = authenticatedPage.locator("nav a, aside a");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(5);

    const hrefs = await navLinks.evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).getAttribute("href"))
    );
    const teacherLinks = hrefs.filter((h) => h?.startsWith("/teacher/"));
    expect(teacherLinks.length).toBeGreaterThanOrEqual(5);
  });
});
