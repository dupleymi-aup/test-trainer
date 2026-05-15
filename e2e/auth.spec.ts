import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Тренажёр/);
    await expect(page.getByRole("heading", { name: /Вход/ })).toBeVisible();
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Регистрация/ })).toBeVisible();
  });

  test("login with invalid credentials fails", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Email или телефон/).fill("nonexistent@test.com");
    await page.getByLabel(/Пароль/).fill("wrongpassword123");
    await page.getByRole("button", { name: /Войти/ }).click();
    await expect(page.getByText(/неверный/i)).toBeVisible({ timeout: 10000 });
  });

  test("redirects to login when accessing profile without auth", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});
