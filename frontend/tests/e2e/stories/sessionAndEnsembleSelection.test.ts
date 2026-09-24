/**
 * Recorded walkthrough for the setup shared by every other story: creating a new session and
 * adding+applying an ensemble. Other stories reuse `createSessionAndSelectEnsemble` to reach this
 * same state, but without narrating it again as part of their own walkthrough.
 *
 * This story then goes further and shows the full lifecycle of a session: adding several modules to
 * the dashboard (choosing where each lands), saving the session, saving a copy, and creating and
 * sharing a snapshot — ending back on the landing page where the session and snapshot now appear.
 */
import { expect } from "@playwright/test";

import { DROGON_AHM } from "../support/drogonTestData";
import { test } from "../support/recordingFixtures";
import { tutorialMeta } from "../support/tutorialMeta";
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

export const meta = tutorialMeta({
    slug: "session-and-ensemble-selection",
    category: "Framework",
    title: "Create, save and share a session",
    description: "Start a session, add an ensemble and modules, then save it and share a snapshot.",
});

test.describe("Session and ensemble selection", () => {
    test("create a session and select and apply an ensemble", async ({ page, narrate, markStep }) => {
        test.setTimeout(300_000);
        test.info().annotations.push({ type: "tutorial-slug", description: meta.slug });

        // Titles the walkthrough saves under; kept human-readable for the recorded video and reused
        // to assert they surface on the landing page afterwards.
        const SESSION_TITLE = "Drogon walkthrough session";
        const SESSION_COPY_TITLE = "Drogon walkthrough session (copy)";
        const SNAPSHOT_TITLE = "Drogon walkthrough snapshot";

        await installFakeCursor(page);
        // Blur every case row in the ensemble case-selector except the Drogon case we use.
        await installCaseRowRedaction(page, [DROGON_AHM.caseUuid]);
        await hideDevOverlays(page);

        await page.goto("/");
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();

        await createSessionAndSelectEnsemble(page, {
            narrate,
            markStep,
            additionalEnsembleNames: [DROGON_AHM.secondEnsembleName],
        });

        markStep("Ensembles applied");
        await narrate("Both ensembles are now applied and ready to use in the session.");

        // Bring a module's list item into view, opening the modules list first if it is collapsed.
        async function ensureModuleListItemVisible(moduleTitle: string) {
            const moduleListItem = page.locator(`[title="${moduleTitle}"]`).first();
            if (!(await moduleListItem.isVisible())) {
                await smoothClick(page, page.getByTestId("modules-list-open-button"));
            }
            await expect(moduleListItem).toBeVisible();
        }

        markStep("Add modules to the dashboard");
        const addModulesNarration = narrate(
            "With the ensembles loaded, we can start building the dashboard. Modules are added by dragging them from the list on the right onto the canvas.",
        );
        await ensureModuleListItemVisible("Simulation Time Series");
        await dragModuleOntoLayout(page, "Simulation Time Series");
        await addModulesNarration;

        const dropRightNarration = narrate(
            "You choose where a module goes by where you drop it. Dropping near the right edge places the next one beside the first, splitting the canvas.",
        );
        await ensureModuleListItemVisible("Flow Network");
        await dragModuleOntoLayout(page, "Flow Network", "right");
        await dropRightNarration;

        const dropBottomNarration = narrate(
            "And dropping near the bottom edge stacks a module underneath, so you can arrange the layout exactly how you want it.",
        );
        await ensureModuleListItemVisible("3D Viewer");
        await dragModuleOntoLayout(page, "3D Viewer", "bottom");
        await dropBottomNarration;
        await pace(page);

        markStep("Save the session");
        const saveNarration = narrate(
            "New sessions start out unsaved. Clicking Save opens a dialog where we give the session a title before storing it.",
        );
        await smoothClick(page, page.getByRole("button", { name: "Save session" }));
        // A new session has never been persisted, so its first save reuses the "Save session as ..." dialog.
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

        markStep("Back on the landing page");
        await smoothClick(page, page.getByRole("button", { name: "Start" }));
        await expect(page.getByText("FMU Analysis").first()).toBeVisible();
        const landingNarration = narrate(
            "Back on the landing page, both the session we saved and the snapshot we just shared now show up under Recent sessions and Recent snapshots, ready to pick up again at any time.",
        );
        // Locally, CosmosDB persists across runs so identically titled items accumulate; the newest is first.
        await expect(page.getByText(SESSION_COPY_TITLE, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText(SNAPSHOT_TITLE, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
        await landingNarration;

        await captureThumbnail(page);
    });
});
