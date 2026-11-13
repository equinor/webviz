import { expect, test } from "@playwright/experimental-ct-react";

import { DashboardTimeSlider } from "@framework/DashboardSettings/components/DashboardTimeSlider";

import { DashboardControlledSettingHarness } from "./support/DashboardControlledSettingHarness";
import { DashboardSettingsPanelHarness } from "./support/DashboardSettingsPanelHarness";

const T1 = Date.UTC(2018, 0, 1);
const T2 = Date.UTC(2019, 0, 1);
const T3 = Date.UTC(2020, 0, 1);

// Longer than the slider's commit delay
const PAST_COMMIT_DELAY_MS = 500;

test.describe("DashboardTimeSlider", () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install();
    });

    test("commits a keyboard step once it has rested", async ({ mount, page }) => {
        const committed: (number | null)[] = [];
        const slider = await mount(
            <DashboardTimeSlider
                value={T1}
                constraints={[T1, T2, T3]}
                isValueValid
                isSettling={false}
                onValueChange={(value) => committed.push(value)}
            />,
        );

        await slider.getByRole("slider").press("ArrowRight");
        await page.clock.runFor(PAST_COMMIT_DELAY_MS);

        await expect.poll(() => committed).toEqual([T2]);
    });

    test("drops a pending keyboard step once the options start recomputing", async ({ mount, page }) => {
        const committed: (number | null)[] = [];
        const onValueChange = (value: number | null) => committed.push(value);
        const slider = await mount(
            <DashboardTimeSlider
                value={T1}
                constraints={[T1, T2, T3]}
                isValueValid
                isSettling={false}
                onValueChange={onValueChange}
            />,
        );

        await slider.getByRole("slider").press("ArrowRight");
        await slider.update(
            <DashboardTimeSlider
                value={T1}
                constraints={[T1, T2, T3]}
                isValueValid
                isSettling
                onValueChange={onValueChange}
            />,
        );
        await page.clock.runFor(PAST_COMMIT_DELAY_MS);

        expect(committed).toEqual([]);
        await expect(slider).toContainText("2018-01-01");
    });

    test("drops a pending keyboard step that is no longer among the options", async ({ mount, page }) => {
        const committed: (number | null)[] = [];
        const onValueChange = (value: number | null) => committed.push(value);
        const slider = await mount(
            <DashboardTimeSlider
                value={T1}
                constraints={[T1, T2, T3]}
                isValueValid
                isSettling={false}
                onValueChange={onValueChange}
            />,
        );

        await slider.getByRole("slider").press("ArrowRight");
        await slider.update(
            <DashboardTimeSlider
                value={T1}
                constraints={[T1, T3]}
                isValueValid
                isSettling={false}
                onValueChange={onValueChange}
            />,
        );
        await page.clock.runFor(PAST_COMMIT_DELAY_MS);

        expect(committed).toEqual([]);
        await expect(slider).toContainText("2018-01-01");
    });
});

test.describe("Dashboard-controlled DPF setting", () => {
    test("reports an unavailable dashboard value", async ({ mount }) => {
        const component = await mount(<DashboardControlledSettingHarness blocked={false} />);

        await expect(component.getByText("Dashboard value not valid here")).toBeVisible();
    });

    test("shows why it is blocked instead of reporting the dashboard value as unavailable", async ({ mount }) => {
        const component = await mount(<DashboardControlledSettingHarness blocked />);

        await expect(component.getByText("Dashboard value not valid here")).toHaveCount(0);
        await expect(component.getByText(/Ensemble/)).toBeVisible();
        await expect(
            component.getByLabel('Controlled by the dashboard setting "Time", whose value is not available here'),
        ).toHaveCount(0);
    });
});

test.describe("Dashboard settings panel", () => {
    test("keeps a setting that never settles removable, while its value can't be changed", async ({ mount }) => {
        const component = await mount(<DashboardSettingsPanelHarness />);

        // The value is covered (and inert) while settling - it can't be focused
        const slider = component.getByRole("slider");
        await slider.focus();
        await expect(slider).not.toBeFocused();

        await component.getByRole("button", { name: "Remove Time" }).click();

        await expect(component.getByText("No dashboard settings yet - add one with +")).toBeVisible();
    });
});
