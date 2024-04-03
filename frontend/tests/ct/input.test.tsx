import { Input } from "@lib/components/Input";
import { expect, test } from "@playwright/experimental-ct-react";

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("Input", () => {
    test("Accepts negative numbers", async ({ mount }) => {
        const input = await mount(<Input type="number" min={-1} max={2} />);

        // Make sure our component is mounted
        await expect(input).toBeVisible();

        // Make sure there is an input element
        const inputElement = await input.locator("input").first();

        // Set value to -1
        await inputElement.focus();
        await inputElement.press("Backspace");
        await inputElement.press("Minus");
        await inputElement.press("Digit1");

        // Make sure value is -1
        expect(await inputElement.inputValue()).toBe("-1");
    });
});
