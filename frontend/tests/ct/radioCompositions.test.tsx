import { expect, test } from "@playwright/experimental-ct-react";

import { RadioCompositions } from "@lib/components/Radio/compositions";
import { Setting } from "@lib/components/Setting";

const OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "delta", label: "Delta" },
];

test.describe("Radio compositions", () => {
    test("name each option by its own label inside a setting field", async ({ mount, page }) => {
        await mount(
            <Setting.Panel>
                <Setting.Section title="Inputs" defaultOpen>
                    <Setting.Field label="Ensemble type" stacked>
                        <RadioCompositions.GroupWithLabels options={OPTIONS} defaultValue="regular" />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>,
        );

        const group = page.getByRole("radiogroup", { name: "Ensemble type" });
        await expect(group.getByRole("radio", { name: "Regular", exact: true })).toBeChecked();
        await expect(group.getByRole("radio", { name: "Delta", exact: true })).not.toBeChecked();
        await expect(group.getByRole("radio", { name: "Ensemble type" })).toHaveCount(0);
    });
});
