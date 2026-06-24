import { expect, test } from "@playwright/test";

/**
 * Verifies that, with a seeded authenticated session (see auth/global-setup.ts), the app boots
 * directly into its logged-in state instead of showing the sign-in screen.
 *
 * This is the keystone test proving the auth bypass works end-to-end in the browser.
 */
test.describe("Authenticated app", () => {
    test("boots in logged-in state (no sign-in screen)", async ({ page }) => {
        await page.goto("/");

        // The unauthenticated sign-in prompt must NOT be shown.
        await expect(page.getByText("Please sign in to continue.")).toHaveCount(0);

        // The logged-in application shell (top bar) should be visible.
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
    });

    test("backend reports the seeded user with Sumo access", async ({ page }) => {
        const response = await page.request.get("/api/logged_in_user");
        expect(response.ok()).toBeTruthy();

        const userInfo = await response.json();
        expect(userInfo.username).toContain("e2e-test-user");
        // Sumo access comes from the on-disk shared key via the sentinel token.
        expect(userInfo.has_sumo_access).toBe(true);
    });
});
