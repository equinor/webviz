/**
 * Recorded walkthrough introducing the Webviz landing page: the entry points for opening existing
 * sessions and snapshots, starting from a template, and finding help (changelog and tutorials).
 */
import { expect } from "@playwright/test";

import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
import { captureThumbnail, hideDevOverlays, installFakeCursor, pace, smoothClick, smoothMoveToLocator } from "../support/walkthroughHelpers";

export const meta = tutorialMeta({
    slug: "landing-page-overview",
    category: "Framework",
    title: "Explore the landing page",
    description: "A tour of the Webviz landing page and how to start working from it.",
    order: 1,
});

test.describe("Landing page", () => {
    test("explore the landing page", async ({ page, narrate, markStep }) => {
        test.setTimeout(180_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        // Render a visible cursor and hide dev-only overlays so the recorded video stays clean.
        await installFakeCursor(page);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        markStep("Introduction");
        await narrate("This is the landing page, which is the starting point every time you open the app.");
        await pace(page);

        markStep("Open a session or snapshot");
        const openSessionNarration = narrate(
            "From here you can pick up where you left off by opening an existing session...",
        );
        await smoothClick(page, page.getByRole("button", { name: "Open session or snapshot..." }));
        await openSessionNarration;
        const openSnapshotNarration = narrate(
            "...or load a shared snapshot. In our case, we don't have any existing sessions or snapshots to load.",
        );
        await smoothClick(page, page.getByRole("tab", { name: "Snapshots" }));
        await openSnapshotNarration;
        await smoothClick(page, page.getByRole("button").first());

        markStep("Start from a template");
        const templateNarration = narrate(
            "You can also start from a ready-made template that sets up a dashboard for a common task, adding the relevant modules and wiring them up so they work together as intended.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Start from template..." }));
        await smoothClick(page, page.getByText("SimulationTimeSeriesField"));
        await captureThumbnail(page);
        await templateNarration;
        await smoothClick(page, page.getByRole("button").filter({ hasText: /^$/ }));

        markStep("Read the changelog");
        const changelogNarration = narrate(
            "The changelog keeps you up to date with the latest additions and fixes. By default, it opens automatically whenever there has been a relevant change since your last visit.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Changelog" }));
        await changelogNarration;

        const changelogNarrationDontShowThis = narrate("You can choose to disable this behavior if you prefer.");
        await smoothClick(page, page.getByRole("checkbox", { name: "Don't show this again" }));
        await changelogNarrationDontShowThis;
        await pace(page);
        await smoothClick(page, page.getByRole("button").filter({ hasText: /^$/ }));

        markStep("Watch tutorials");
        const tutorialsNarration = narrate(
            "In the tutorials section, you have in-app access to short videos on selected topics \u2014 like this one \u2014 that walk you through the app step by step.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Watch tutorials" }));
        await tutorialsNarration;
        await smoothClick(page, page.getByRole("button"));

        markStep("Topbar section");

        await smoothClick(page, page.getByRole("button").first());
        await narrate("The top bar holds important buttons and links.");

        await smoothMoveToLocator(page, page.getByRole("link", { name: "Sumo" }));
        await narrate(
            "On the far left is a link to Sumo, the results management tool that Webviz fetches most of its data from.",
        );

        await smoothMoveToLocator(page, page.getByRole("link", { name: "FMU Hub" }));
        await narrate("Next to it, a link to the FMU Hub.");

        await smoothMoveToLocator(page, page.getByRole("button", { name: "Enter fullscreen (F11)" }));
        await narrate("You can also switch to fullscreen mode from here whenever you want more room to work.");

        const darkModeNarration = narrate("If you prefer dark mode you can toggle it on here.");
        const darkModeButton = page.getByRole("button", { name: "Toggle dark mode" });
        await smoothClick(page, darkModeButton);
        await darkModeNarration;
        const lightModeNarration = narrate("You can switch back to light mode just as easily.");
        await smoothClick(page, darkModeButton);
        await lightModeNarration;

        await narrate("Finally, you can choose how compact the layout should be.");
        const densityModeButton = page.getByRole("button", { name: "Toggle density mode" });
        await smoothClick(page, densityModeButton);
        await narrate(
            "Switching to the compact density mode makes the fonts and spacing smaller, freeing up more screen space for data visualization.",
        );
        await smoothClick(page, densityModeButton);
        await narrate("The same control brings you back to the regular, roomier layout.");
        await pace(page);
        await narrate("That completes our tour of the landing page.");
    });
});
