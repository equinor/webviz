import { Setting } from "@lib/components/Setting";

import { expect, test } from "./support/offlineComponentTest";

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
