import { expect, test } from "@playwright/experimental-ct-react";

import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";

test.describe("NumberInput", () => {
    test("shows the step buttons by default and hides them with showStepButtons={false}", async ({ mount, page }) => {
        const component = await mount(<NumberInput defaultValue={1} />);
        await expect(page.getByRole("button", { name: "Increase" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Decrease" })).toBeVisible();

        await component.update(<NumberInput defaultValue={1} showStepButtons={false} />);
        await expect(page.getByRole("button")).toHaveCount(0);
        await expect(page.getByRole("textbox")).toHaveValue("1");
    });

    test("is named by its field label unless an aria-label is given", async ({ mount, page }) => {
        await mount(
            <Setting.Panel>
                <Setting.Section title="Inputs" defaultOpen>
                    <Setting.Field label="Discount rate">
                        <NumberInput defaultValue={8} />
                    </Setting.Field>
                    <Setting.Field label="Costs">
                        <NumberInput defaultValue={100} aria-label="CAPEX 2030" />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>,
        );

        await expect(page.getByRole("textbox", { name: "Discount rate", exact: true })).toHaveValue("8");
        await expect(page.getByRole("textbox", { name: "CAPEX 2030", exact: true })).toHaveValue("100");
        await expect(page.getByRole("textbox", { name: "Costs", exact: true })).toHaveCount(0);
    });

    test("is named by an explicit aria-labelledby instead of its field label", async ({ mount, page }) => {
        await mount(
            <Setting.Panel>
                <Setting.Section title="Inputs" defaultOpen>
                    <Setting.Field label="Costs">
                        <span id="opex-2031">OPEX 2031</span>
                        <NumberInput defaultValue={50} aria-labelledby="opex-2031" />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>,
        );

        await expect(page.getByRole("textbox", { name: "OPEX 2031", exact: true })).toHaveValue("50");
        await expect(page.getByRole("textbox", { name: "Costs", exact: true })).toHaveCount(0);
    });
});
