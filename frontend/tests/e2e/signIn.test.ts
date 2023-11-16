import { expect, test } from "@playwright/test";

test("Test sign in", async ({ page }) => {
    await page.goto("http://localhost:8080/");
    const redirectUri = encodeURIComponent(new URL("api/auth-callback", page.url()).toString());
    const urlRegEx = new RegExp(
        `^https://login\\.microsoftonline\\.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0/oauth2/v2\\.0/authorize\\?client_id=[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}&response_type=code&redirect_uri=${redirectUri}`
    );
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.url()).toEqual(expect.stringMatching(urlRegEx));
});
