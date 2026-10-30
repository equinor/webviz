import { expect, test } from "@playwright/experimental-ct-react";

import { addVectorToSelector, removeVectorFromSelector } from "../e2e/support/walkthroughHelpers";

test.describe("Vector walkthrough helpers", () => {
    test("waits for delayed settings before adding a vector", async ({ page }) => {
        await page.setContent(`
            <script>
                setTimeout(() => {
                    document.body.innerHTML = '<div data-testid="vector-selector"><input><ul></ul></div>';
                    document.querySelector("input").addEventListener("keydown", (event) => {
                        if (event.key === "Enter") {
                            const tag = document.createElement("li");
                            tag.title = event.target.value;
                            tag.textContent = event.target.value;
                            document.querySelector("ul").append(tag);
                        }
                    });
                }, 5500);
            </script>
        `);

        await addVectorToSelector(page, "WBHP:A1");

        await expect(page.getByTestId("vector-selector").locator('li[title="WBHP:A1"]')).toHaveCount(1);
    });

    test("waits for delayed settings before removing a vector", async ({ page }) => {
        await page.setContent(`
            <script>
                setTimeout(() => {
                    document.body.innerHTML = '<div data-testid="vector-selector"><ul><li title="WBHP:A1">WBHP:A1<button>Remove</button></li></ul></div>';
                    document.querySelector("button").addEventListener("click", () => {
                        document.querySelector("li").remove();
                    });
                }, 5500);
            </script>
        `);

        await removeVectorFromSelector(page, "WBHP:A1");

        await expect(page.getByTestId("vector-selector").locator("li")).toHaveCount(0);
    });
});
