import React from "react";

import { Select, SelectOption } from "@lib/components/Select";
import { expect, test } from "@playwright/experimental-ct-react";

test.use({ viewport: { width: 1920, height: 1080 } });

const selectOptions1: SelectOption[] = [];
const selectOptions2: SelectOption[] = [];

for (let i = 0; i < 100; i++) {
    selectOptions1.push({ label: `Option ${i}`, value: i.toString() });
    if (i >= 50) {
        continue;
    }
    selectOptions2.push({ label: `Option ${i}`, value: i.toString() });
}

test.describe("Select", () => {
    test("Showing options properly", async ({ mount }) => {
        const size = 10;
        let selection: string[] = [];
        function handleChange(values: string[]) {
            selection = values;
        }

        const select = await mount(<Select options={selectOptions1} size={size} onChange={handleChange} />);
        await expect(select).toBeVisible();
        const firstDiv = await select.locator("div").first();
        const secondDiv = await firstDiv.locator("div").first();
        await expect((await secondDiv.locator("div").count()) > size).toBeTruthy();
    });
});
