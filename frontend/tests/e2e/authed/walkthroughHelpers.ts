import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Helpers for the recorded UI walkthrough tests.
 *
 * The walkthrough doubles as a tutorial video (uploaded to blob storage from CI when RECORD=1),
 * so when recording we deliberately slow the interactions down to make the resulting video
 * watchable. When not recording the same test runs at full speed as a normal regression check.
 */

/** True when the run is capturing video (set via RECORD=1, see tests/e2e/_playwright.config.ts). */
export const RECORDING = !!process.env.RECORD;

/** Pause lengths (ms) used only while recording, to give the viewer time to follow along. */
const PACING_MS = {
    short: 300,
    medium: 600,
    long: 1200,
} as const;

/**
 * Pause for a human-watchable beat between walkthrough steps. No-op unless RECORD=1, so it does
 * not slow down normal (non-recording) test runs.
 */
export async function pace(page: Page, duration: keyof typeof PACING_MS = "medium"): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await page.waitForTimeout(PACING_MS[duration]);
}

/**
 * Render a fake mouse cursor into the page so it shows up in the recorded video.
 *
 * Playwright captures video via the browser's screencast, which does NOT paint the real OS cursor.
 * Without this, the tutorial videos show UI reacting (hovers, clicks, drags) but no visible pointer.
 * We inject a small DOM dot that follows pointer movement and pulses on press, so the viewer can
 * follow the interaction. No-op unless RECORD=1, so normal test runs are unaffected.
 *
 * Must be called BEFORE `page.goto(...)` so the init script is registered for the first navigation.
 */
export async function installFakeCursor(page: Page): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await page.addInitScript(() => {
        const ID = "__pw_fake_cursor__";
        const RIPPLE_STYLE_ID = "__pw_fake_cursor_ripple_style__";

        function ensureRippleKeyframes(): void {
            if (document.getElementById(RIPPLE_STYLE_ID)) {
                return;
            }
            const style = document.createElement("style");
            style.id = RIPPLE_STYLE_ID;
            style.textContent = `@keyframes __pw_cursor_ripple__ {
                0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0.6; }
                100% { transform: translate(-50%, -50%) scale(1);    opacity: 0;   }
            }`;
            document.documentElement.appendChild(style);
        }

        function ensureCursor(): HTMLElement {
            let cursor = document.getElementById(ID);
            if (cursor) {
                return cursor;
            }
            cursor = document.createElement("div");
            cursor.id = ID;
            cursor.style.cssText = [
                "position: fixed",
                "top: 0",
                "left: 0",
                "width: 22px",
                "height: 22px",
                "margin: -11px 0 0 -11px",
                "border-radius: 50%",
                "background: rgba(255, 18, 67, 0.35)",
                "border: 2px solid rgba(255, 18, 67, 0.9)",
                "box-shadow: 0 0 6px rgba(0, 0, 0, 0.35)",
                "pointer-events: none",
                "z-index: 2147483647",
                "transition: transform 80ms ease-out, background 120ms ease-out",
                "will-change: transform, left, top",
            ].join(";");
            document.documentElement.appendChild(cursor);
            return cursor;
        }

        function place(x: number, y: number): void {
            const cursor = ensureCursor();
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }

        /**
         * Spawn an expanding-and-fading ring at (x, y) to make clicks clearly visible in the video.
         * Several concentric rings with staggered delays read as a "click pulse" radiating outward.
         */
        function ripple(x: number, y: number): void {
            ensureRippleKeyframes();
            const RINGS = 2;
            const SIZE = 90;
            for (let i = 0; i < RINGS; i++) {
                const ring = document.createElement("div");
                ring.style.cssText = [
                    "position: fixed",
                    `left: ${x}px`,
                    `top: ${y}px`,
                    `width: ${SIZE}px`,
                    `height: ${SIZE}px`,
                    "border-radius: 50%",
                    "border: 3px solid rgba(255, 18, 67, 0.9)",
                    "box-shadow: 0 0 8px rgba(255, 18, 67, 0.6)",
                    "pointer-events: none",
                    "z-index: 2147483646",
                    "transform: translate(-50%, -50%) scale(0.25)",
                    `animation: __pw_cursor_ripple__ 600ms ease-out ${i * 140}ms forwards`,
                ].join(";");
                document.documentElement.appendChild(ring);
                window.setTimeout(() => ring.remove(), 600 + i * 140 + 50);
            }
        }

        function press(pressed: boolean): void {
            const cursor = ensureCursor();
            cursor.style.transform = pressed ? "scale(0.6)" : "scale(1)";
            cursor.style.background = pressed ? "rgba(255, 18, 67, 0.55)" : "rgba(255, 18, 67, 0.35)";
        }

        // Re-attach the cursor element if the page navigates / re-renders the body.
        window.addEventListener("DOMContentLoaded", () => ensureCursor());

        // Expose the ripple so the test can fire it slightly BEFORE issuing the real click; the
        // ripple's grow-and-fade takes a few hundred ms, so triggering it on the actual click makes
        // it read as happening after the click. A small lead time keeps it in sync with the action.
        (window as unknown as { __pwFakeCursorRipple__?: (x: number, y: number) => void }).__pwFakeCursorRipple__ =
            ripple;

        window.addEventListener("pointermove", (e) => place(e.clientX, e.clientY), { capture: true });
        window.addEventListener("mousemove", (e) => place(e.clientX, e.clientY), { capture: true });
        window.addEventListener("pointerdown", () => press(true), { capture: true });
        window.addEventListener("mousedown", () => press(true), { capture: true });
        window.addEventListener("pointerup", () => press(false), { capture: true });
        window.addEventListener("mouseup", () => press(false), { capture: true });
    });
}

/**
 * Inject a persistent <style> element carrying `css` (identified by `styleId`) into every document
 * the page loads.
 *
 * Registered via `addInitScript` so it runs for the first navigation and any subsequent ones. The
 * <style> is appended on `DOMContentLoaded` rather than at document-start: when `addInitScript` runs
 * (document-start) `document.head` does not exist yet, and appending to `documentElement` at that
 * point is unreliable (the node can end up outside <head> and/or the not-yet-parsed document), which
 * silently leaves the styles unapplied. Deferring guarantees <head> exists on the real, parsed
 * document. If the document is already past loading (e.g. the script is re-run), it injects at once.
 */
async function injectRecordingStyle(page: Page, styleId: string, css: string): Promise<void> {
    await page.addInitScript(
        ({ id, cssText }: { id: string; cssText: string }) => {
            function ensureStyle(): void {
                if (document.getElementById(id)) {
                    return;
                }
                const parent = document.head ?? document.documentElement;
                if (!parent) {
                    return;
                }
                const style = document.createElement("style");
                style.id = id;
                style.textContent = cssText;
                parent.appendChild(style);
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", ensureStyle, { once: true });
            } else {
                ensureStyle();
            }
        },
        { id: styleId, cssText: css },
    );
}

/**
 * Blur every case row in the ensemble case-selector EXCEPT the ones whose case UUID is in
 * `allowedCaseUuids`.
 *
 * Implemented as pure CSS, which is bulletproof for a video: the rule is evaluated by the browser at
 * paint time, so a non-allowed cell can never render readable — not even for one frame, and not when
 * the virtualized table mounts/recycles rows during scrolling.
 *
 * Relies on a production hook: every identifying case cell (name/id, description, author) carries a
 * `data-case-uuid="<case uuid>"` attribute on a normal block-level <div>. We blur those divs
 * directly (not the <tr>/<td>), because CSS `filter` — like `opacity` and `transform` — is not
 * reliably rendered on `display: table-row`/`table-cell` boxes in Chromium, whereas a plain <div>
 * renders it fine. The attribute is unique to case cells, so no extra scoping is needed.
 *
 * No-op unless RECORD=1, so normal test runs are unaffected. Must be called BEFORE `page.goto(...)`
 * so the init script is registered for the first navigation (and re-applied on every navigation).
 */
export async function installCaseRowRedaction(page: Page, allowedCaseUuids: string[]): Promise<void> {
    if (!RECORDING) {
        return;
    }
    const allowed = allowedCaseUuids.map((uuid) => uuid.toLowerCase());
    // Allow cells whose case UUID is in the allowlist; blur every other case cell so its text is
    // unreadable. Case UUIDs are lowercase in both the DOM and the allowlist, so we match exactly
    // (no CSS Level 4 `i` flag, which — if ever rejected — would invalidate the whole `:not()` and
    // drop the entire rule). A moderate blur keeps each cell visible as a recognizable (but
    // unreadable) smudge — strong enough to obscure case names/authors, light enough that small
    // cells like the author avatar don't disappear entirely.
    const allowSelectors = allowed.map((uuid) => `:not([data-case-uuid="${uuid}"])`).join("");
    const css = `[data-case-uuid]${allowSelectors} {
        filter: blur(5px) !important;
        user-select: none !important;
    }`;
    await injectRecordingStyle(page, "__pw_case_row_redaction_style__", css);
}

/**
 * Hide developer-only overlays that float over the app so they don't appear in the recorded video.
 *
 * The app's own dev tools are suppressed by seeding `devToolsVisible=false` (see auth/global-setup),
 * but the TanStack React Query Devtools render their own floating toggle button (the logo in the
 * lower-left corner) independently of that flag. We hide it with pure CSS, which can't be missed for
 * a single frame regardless of when the button mounts.
 *
 * No-op unless RECORD=1, so normal test runs are unaffected. Must be called BEFORE `page.goto(...)`
 * so the init script is registered for the first navigation.
 */
export async function hideDevOverlays(page: Page): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await injectRecordingStyle(page, "__pw_hide_dev_overlays_style__", `.tsqd-parent-container { display: none !important; }`);
}

/**
 * Glide the real Playwright mouse to the centre of `locator` in several small steps so the injected
 * fake cursor (which follows pointer/mouse move events) animates smoothly across the screen instead
 * of teleporting. Playwright interpolates from its last known pointer position, so the resulting
 * `mousemove` events trace a visible path.
 *
 * No-op unless RECORD=1 — outside recording we don't want to pay for the extra movement, and the
 * subsequent action waits for/locates the element on its own. Best-effort: any failure here is
 * swallowed so a purely-cosmetic cursor animation can never fail a test.
 */
async function smoothMoveToLocator(page: Page, locator: Locator): Promise<void> {
    if (!RECORDING) {
        return;
    }
    try {
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 32 });
        }
    } catch {
        // Cursor animation is purely cosmetic; never let it break the walkthrough.
    }
}

/**
 * Click a locator, first gliding the (visible) cursor over to it when recording so the motion is
 * easy to follow in the tutorial video. A click ripple is fired slightly BEFORE the real click so
 * its grow-and-fade animation lines up with (rather than trails) the action. Behaves like a plain
 * `locator.click(options)` otherwise.
 */
export async function smoothClick(
    page: Page,
    locator: Locator,
    options?: Parameters<Locator["click"]>[0],
): Promise<void> {
    await smoothMoveToLocator(page, locator);
    if (RECORDING) {
        try {
            const box = await locator.boundingBox();
            if (box) {
                const x = box.x + box.width / 2;
                const y = box.y + box.height / 2;
                await page.evaluate(
                    ([px, py]) =>
                        (
                            window as unknown as { __pwFakeCursorRipple__?: (x: number, y: number) => void }
                        ).__pwFakeCursorRipple__?.(px, py),
                    [x, y] as const,
                );
                // Brief lead so the ripple is already expanding when the click lands.
                await page.waitForTimeout(160);
            }
        } catch {
            // Cursor ripple is purely cosmetic; never let it break the walkthrough.
        }
    }
    await locator.click(options);
}

/**
 * Fill a locator, first gliding the (visible) cursor over to it when recording so the motion is
 * easy to follow in the tutorial video. Behaves like a plain `locator.fill(value)` otherwise.
 */
export async function smoothFill(page: Page, locator: Locator, value: string): Promise<void> {
    await smoothMoveToLocator(page, locator);
    await locator.fill(value);
}

/**
 * Drag a module from the modules list onto the dashboard layout.
 *
 * Module placement uses native pointer events (the modules list item publishes a "new module"
 * event on `pointerdown`, and the layout component handles `pointermove`/`pointerup` on the
 * document). We reproduce that gesture with Playwright's mouse API:
 *  1. press on the list item,
 *  2. move past the drag threshold so dragging starts,
 *  3. move into the layout area,
 *  4. DWELL there so the layout's ~500ms drop-preview timer fires (this is what inserts the new
 *     module into the layout; without it the release is a no-op),
 *  5. release to create the module instance.
 *
 * The gesture is retried until the module instance actually appears in the layout, because the
 * drop-preview timer can be reset by closely-spaced synthetic pointer moves and occasionally needs
 * another attempt to commit.
 */
export async function dragModuleOntoLayout(page: Page, moduleDisplayName: string): Promise<void> {
    const layout = page.getByTestId("module-layout");
    await expect(layout).toBeVisible();

    // The dropped module's header carries the module title; use it to confirm the drop committed.
    const droppedModule = layout.getByTitle(moduleDisplayName).first();

    await smoothMoveToLocator(page, page.locator(`[title="${moduleDisplayName}"]`).first());

    await expect(async () => {
        const moduleItem = page.locator(`[title="${moduleDisplayName}"]`).first();
        await expect(moduleItem).toBeVisible();

        const itemBox = await moduleItem.boundingBox();
        const layoutBox = await layout.boundingBox();
        if (!itemBox || !layoutBox) {
            throw new Error("Could not resolve bounding boxes for module item or layout drop target");
        }

        const startX = itemBox.x + itemBox.width / 2;
        const startY = itemBox.y + itemBox.height / 2;
        const targetX = layoutBox.x + layoutBox.width / 2;
        const targetY = layoutBox.y + layoutBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        try {
            // Exceed the drag threshold (MANHATTAN_LENGTH) so the layout starts tracking the drag.
            await page.mouse.move(startX + 16, startY + 16, { steps: 8 });
            // Move into the layout area, slowly enough to be visible while recording.
            await page.mouse.move(targetX, targetY, { steps: RECORDING ? 40 : 20 });
            // Dwell on the target so the layout's drop-preview timer (~500ms) fires while the
            // pointer is stationary inside the canvas.
            await page.waitForTimeout(700);
            // A tiny jiggle + second dwell makes the preview commit reliably.
            await page.mouse.move(targetX + 3, targetY + 3, { steps: 3 });
            await page.waitForTimeout(700);
            await page.mouse.up();
        } catch (error) {
            // Make sure we never leave the mouse button pressed between retries.
            await page.mouse.up().catch(() => undefined);
            throw error;
        }

        await expect(droppedModule).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000, intervals: [1_000] });
}
