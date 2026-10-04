import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import {
    captureThumbnail,
    createSessionAndSelectEnsemble,
    dragModuleOntoLayout,
    hideDevOverlays,
    installCaseRowRedaction,
    installFakeCursor,
    pace,
    smoothClick,
    smoothMoveToLocator,
    smoothType,
} from "../support/walkthroughHelpers";

import { meta } from "./sessionAndEnsembleSelection.meta";

test.describe("Session and ensemble selection", () => {
    test("create a session and select and apply an ensemble", async ({ page, narrate, markStep }) => {
        test.setTimeout(360_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        const SESSION_TITLE = "Drogon walkthrough session";
        const SESSION_COPY_TITLE = "Drogon walkthrough session (copy)";
        const SNAPSHOT_TITLE = "Drogon walkthrough snapshot";
        const DASHBOARD_OVERVIEW_TITLE = "Production overview";
        const DASHBOARD_DETAILS_TITLE = "Well details";

        await installFakeCursor(page);
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await createSessionAndSelectEnsemble(page, {
            narrate,
            markStep,
            additionalEnsembleNames: [DROGON_AHM.secondEnsembleName],
        });

        await narrate("Both ensembles are now applied and ready to use in the session.");

        markStep("Add modules to the dashboard");
        const addModulesNarration = narrate(
            "With the ensembles loaded, we can start building the dashboard. Modules are added by dragging them from the list on the right onto the canvas.",
        );
        await dragModuleOntoLayout(page, "Simulation Time Series");
        await addModulesNarration;

        const dropRightNarration = narrate(
            "You choose where a module goes by where you drop it. Dropping near the right edge places the next one beside the first, splitting the canvas.",
        );
        await dragModuleOntoLayout(page, "Flow Network", "right");
        await dropRightNarration;

        const dropBottomNarration = narrate(
            "And dropping near the bottom edge stacks a module underneath, so you can arrange the layout exactly how you want it.",
        );
        await dragModuleOntoLayout(page, "3D Viewer", "bottom");
        await dropBottomNarration;
        await pace(page);

        markStep("Organize work across dashboards");
        const dashboardsIntroNarration = narrate(
            "A session isn't limited to a single dashboard. The bar along the bottom lets you organize several — add new ones, duplicate them, rename them, and reorder them.",
        );
        await smoothMoveToLocator(page, page.getByRole("tablist", { name: "Dashboards" }));
        await dashboardsIntroNarration;
        await pace(page);

        const renameNarration = narrate(
            "Each dashboard has an actions menu. Edit metadata lets us give this first one a meaningful title.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Open actions for Dashboard 1", exact: true }));
        await smoothClick(page, page.getByRole("menuitem", { name: "Edit metadata" }));
        await expect(page.getByRole("heading", { name: "Edit dashboard metadata", exact: true })).toBeVisible();
        await smoothType(page, page.getByPlaceholder("Enter dashboard name"), DASHBOARD_OVERVIEW_TITLE);
        await renameNarration;
        await smoothClick(page, page.getByRole("button", { name: "Apply", exact: true }));
        await expect(page.getByRole("heading", { name: "Edit dashboard metadata", exact: true })).toBeHidden();
        await expect(page.getByRole("tab", { name: DASHBOARD_OVERVIEW_TITLE, exact: true })).toBeVisible();
        await pace(page);

        const addDashboardNarration = narrate(
            "The plus button adds a fresh, empty dashboard, which becomes active so we can build it out separately. We'll give it a title too.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Add new dashboard" }));
        await expect(page.getByRole("tab", { name: "Dashboard 2", exact: true })).toBeVisible();
        await smoothClick(page, page.getByRole("button", { name: "Open actions for Dashboard 2", exact: true }));
        await smoothClick(page, page.getByRole("menuitem", { name: "Edit metadata" }));
        await expect(page.getByRole("heading", { name: "Edit dashboard metadata", exact: true })).toBeVisible();
        await smoothType(page, page.getByPlaceholder("Enter dashboard name"), DASHBOARD_DETAILS_TITLE);
        await smoothClick(page, page.getByRole("button", { name: "Apply", exact: true }));
        await expect(page.getByRole("heading", { name: "Edit dashboard metadata", exact: true })).toBeHidden();
        await expect(page.getByRole("tab", { name: DASHBOARD_DETAILS_TITLE, exact: true })).toBeVisible();
        await addDashboardNarration;
        await pace(page);

        const copyNarration = narrate(
            "Create a copy duplicates a dashboard with all of its modules, so you can branch off an existing layout instead of starting from scratch.",
        );
        await smoothClick(
            page,
            page.getByRole("button", { name: `Open actions for ${DASHBOARD_OVERVIEW_TITLE}`, exact: true }),
        );
        await smoothClick(page, page.getByRole("menuitem", { name: "Create a copy" }));
        await expect(page.getByRole("tab", { name: `${DASHBOARD_OVERVIEW_TITLE} (Copy)`, exact: true })).toBeVisible({
            timeout: 60_000,
        });
        await copyNarration;
        await pace(page);

        const reorderNarration = narrate(
            "And the Move left and Move right actions reorder the dashboards until the sequence tells the story you want.",
        );
        const copyActionsLabel = `Open actions for ${DASHBOARD_OVERVIEW_TITLE} (Copy)`;
        await smoothClick(page, page.getByRole("button", { name: copyActionsLabel, exact: true }));
        await smoothClick(page, page.getByRole("menuitem", { name: "Move left" }));
        await pace(page);
        await smoothClick(page, page.getByRole("button", { name: copyActionsLabel, exact: true }));
        await smoothClick(page, page.getByRole("menuitem", { name: "Move right" }));
        await reorderNarration;
        await pace(page);

        markStep("Save the session");
        const saveNarration = narrate(
            "New sessions start out unsaved. Clicking Save opens a dialog where we give the session a title before storing it.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Save session" }));
        await expect(page.getByRole("heading", { name: "Save session as ...", exact: true })).toBeVisible();
        await smoothType(page, page.getByPlaceholder("Enter session title"), SESSION_TITLE);
        await saveNarration;
        await smoothClick(page, page.getByRole("button", { name: "Save", exact: true }));
        await expect(page.getByRole("heading", { name: "Save session as ...", exact: true })).toBeHidden({
            timeout: 60_000,
        });
        await pace(page);

        markStep("Save a copy");
        const saveAsNarration = narrate(
            "The dropdown next to Save lets us keep the current session and store its current state as a separate copy, using Save session as.",
        );
        await smoothClick(page, page.getByRole("button", { name: "More save options" }));
        await smoothClick(page, page.getByRole("menuitem", { name: "Save session as ..." }));
        await expect(page.getByRole("heading", { name: "Save session as ...", exact: true })).toBeVisible();
        await smoothType(page, page.getByPlaceholder("Enter session title"), SESSION_COPY_TITLE);
        await saveAsNarration;
        await smoothClick(page, page.getByRole("button", { name: "Save", exact: true }));
        await expect(page.getByRole("heading", { name: "Save session as ...", exact: true })).toBeHidden({
            timeout: 60_000,
        });
        await pace(page);

        markStep("Create and share a snapshot");
        const snapshotNarration = narrate(
            "A snapshot captures the current dashboard as a read-only, shareable link — perfect for handing a specific view to a colleague.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Make a snapshot of the current session" }));
        await expect(page.getByRole("heading", { name: "Create Snapshot", exact: true })).toBeVisible();
        await smoothType(page, page.getByPlaceholder("Enter snapshot title"), SNAPSHOT_TITLE);
        await snapshotNarration;
        await smoothClick(page, page.getByRole("button", { name: "Create snapshot" }));

        await expect(page.getByRole("heading", { name: "Snapshot created successfully!" })).toBeVisible({
            timeout: 60_000,
        });
        // The link is built from the local dev origin; show the production URL in the recording only.
        await page
            .getByRole("dialog")
            .getByRole("textbox")
            .last()
            .evaluate((el, prodOrigin) => {
                const input = el as HTMLInputElement;
                input.value = input.value.replace(/^https?:\/\/[^/]+/, prodOrigin);
            }, "https://webviz.fmu.equinor.com");
        const shareNarration = narrate(
            "The snapshot is created, and sharing this link is all it takes to give others access to exactly this view.",
        );
        // Point the cursor at the generated link so the shareable URL is highlighted in the video.
        await smoothMoveToLocator(page, page.getByRole("dialog").getByRole("textbox").last());
        await shareNarration;
        await smoothClick(page, page.getByRole("button", { name: "Done" }));
        await pace(page);

        await smoothClick(page, page.getByRole("button", { name: "Start" }));
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        const landingNarration = narrate(
            "Back on the landing page, both the session we saved and the snapshot we just shared now show up under Recent sessions and Recent snapshots, ready to pick up again at any time.",
        );

        await expect(page.getByText(SESSION_COPY_TITLE, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText(SNAPSHOT_TITLE, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await landingNarration;

        await captureThumbnail(page);
    });
});
