import React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { expect, test } from "@playwright/experimental-ct-react";

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("Checkbox", () => {
    test("Can be checked", async ({ mount }) => {
        let programmaticallyChecked = false;
        function handleChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
            programmaticallyChecked = checked;
        }

        const checkBox = await mount(<Checkbox label="Checkbox" onChange={handleChange} />);
        await expect(checkBox).toContainText("Checkbox");
        await checkBox.locator("label").click();
        expect(programmaticallyChecked).toBe(true);
    });
});
