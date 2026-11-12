import { expect, test } from "@playwright/experimental-ct-react";

import { Setting } from "@lib/components/Setting";

test("names each help button by its string help title", async ({ mount, page }) => {
    await mount(
        <Setting.Panel>
            <Setting.Section title="Inputs" defaultOpen>
                <Setting.Field label="Rate" help={{ title: "Discount rate", content: "Annual rate." }}>
                    <input />
                </Setting.Field>
                <Setting.Field label="Year" help={{ title: "Reference year", content: "First year." }} stacked>
                    <input />
                </Setting.Field>
                <Setting.Field help={{ title: "Unlabelled", content: "Next to the input." }}>
                    <input />
                </Setting.Field>
                <Setting.Field label="Other" help={{ title: <b>Rich title</b>, content: "Rich." }}>
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    for (const name of ["Discount rate", "Reference year", "Unlabelled"]) {
        await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "More information", exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: "Reference year", exact: true }).click();
    await expect(page.getByText("First year.")).toBeVisible();
});

test("keeps Section uncontrolled by default and honors defaultOpen", async ({ mount, page }) => {
    await mount(
        <Setting.Panel>
            <Setting.Section title="Closed">
                <Setting.Field label="First">
                    <input />
                </Setting.Field>
            </Setting.Section>
            <Setting.Section title="Open" defaultOpen>
                <Setting.Field label="Second">
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    const closed = page.getByRole("button", { name: "Closed", exact: true });
    const open = page.getByRole("button", { name: "Open", exact: true });
    await expect(closed).toHaveAttribute("aria-expanded", "false");
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await closed.click();
    await expect(closed).toHaveAttribute("aria-expanded", "true");
    await open.click();
    await expect(open).toHaveAttribute("aria-expanded", "false");
});

test("allows the owner to reveal a controlled Section", async ({ mount, page }) => {
    const changes: boolean[] = [];
    const onOpenChange = (open: boolean) => changes.push(open);
    const component = await mount(
        <Setting.Panel>
            <Setting.Section title="Controlled" open={false} onOpenChange={onOpenChange}>
                <Setting.Field label="Value">
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    const trigger = page.getByRole("button", { name: "Controlled", exact: true });
    await trigger.click();
    await expect.poll(() => changes).toEqual([true]);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await component.update(
        <Setting.Panel>
            <Setting.Section title="Controlled" open onOpenChange={onOpenChange}>
                <Setting.Field label="Value">
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("textbox")).toBeVisible();
    await trigger.click();
    await expect.poll(() => changes).toEqual([true, false]);
});

test("does not change its own state while controlled", async ({ mount, page }) => {
    const component = await mount(
        <Setting.Panel>
            <Setting.Section title="Controlled" open={false}>
                <Setting.Field label="Value">
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    const trigger = page.getByRole("button", { name: "Controlled", exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Released to its own state, it keeps the state it had before the ignored click.
    await component.update(
        <Setting.Panel>
            <Setting.Section title="Controlled">
                <Setting.Field label="Value">
                    <input />
                </Setting.Field>
            </Setting.Section>
        </Setting.Panel>,
    );
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
