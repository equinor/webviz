import path from "path";

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { DROGON_AHM } from "./drogonTestData";

/**
 * Helpers for the recorded UI walkthrough tests.
 *
 * The walkthrough doubles as a tutorial video (uploaded to blob storage from CI when RECORD=1),
 * so when recording we deliberately slow the interactions down to make the resulting video
 * watchable. When not recording the same test runs at full speed as a normal regression check.
 */

/** True when the run is capturing video (set via RECORD=1, see tests/e2e/_playwright.config.ts). */
export const RECORDING = !!process.env.RECORD;

/**
 * Save a still frame of the page as the tutorial's preview thumbnail (used as the poster image in
 * the in-app Tutorials dialog). Call this at the moment that best represents the finished result.
 * No-op unless RECORD=1.
 */
export async function captureThumbnail(page: Page): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await page.screenshot({ path: path.join(test.info().outputDir, "thumbnail.png") });
}

/** Pause lengths (ms) used only while recording, to give the viewer time to follow along. */
const PACING_MS = {
    short: 300,
    medium: 600,
    long: 1200,
} as const;

/**
 * Cursor glide speed while recording: one interpolation step per this many pixels of travel, so the
 * fake cursor moves at a roughly constant on-screen speed regardless of how far apart two targets
 * are (constant speed, not constant time). Steps are clamped so very short/long hops still look ok.
 */
const CURSOR_PX_PER_STEP = 10;
const CURSOR_MIN_STEPS = 6;
const CURSOR_MAX_STEPS = 50;

/** Last known mouse position per page, used to size the glide by travel distance. */
const lastMousePosition = new WeakMap<Page, { x: number; y: number }>();

/**
 * Move the real mouse to (x, y) at a roughly constant on-screen speed by sizing the number of
 * interpolation steps to the travel distance. Tracks the last position per page so the next glide
 * can measure how far it has to travel (Playwright's internal mouse starts at 0,0).
 */
async function glideMouseTo(page: Page, x: number, y: number): Promise<void> {
    const from = lastMousePosition.get(page) ?? { x: 0, y: 0 };
    const distance = Math.hypot(x - from.x, y - from.y);
    const steps = Math.min(CURSOR_MAX_STEPS, Math.max(CURSOR_MIN_STEPS, Math.round(distance / CURSOR_PX_PER_STEP)));
    await page.mouse.move(x, y, { steps });
    lastMousePosition.set(page, { x, y });
}

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
 * renders it fine. The attribute is unique to case cells, so no extra scoping is needed. As a
 * belt-and-braces fallback (blur doesn't always composite into the screencast), the text is also
 * made transparent with a blurred shadow, so glyphs stay unreadable even if the blur doesn't paint.
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
    const blockSelector = `[data-case-uuid]${allowSelectors}`;
    // Two layers, because `filter: blur` alone proved fragile: depending on how the cell is wrapped
    // and stacked, Chromium doesn't always composite the blur into the screencast. So we ALSO smear
    // the glyphs themselves — transparent text casting a blurred shadow — which never relies on
    // filter compositing and reaches text in nested spans via the descendant selector. If the blur
    // does paint we simply get both; if it doesn't, the text is still unreadable. Author avatars are
    // images, which a text smear can't hide, so any img/svg in a non-allowed cell is hidden outright.
    const css = `${blockSelector} {
        filter: blur(5px) !important;
        user-select: none !important;
    }
    ${blockSelector},
    ${blockSelector} * {
        color: transparent !important;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.6) !important;
    }
    ${blockSelector} img,
    ${blockSelector} svg {
        visibility: hidden !important;
    }`;
    await injectRecordingStyle(page, "__pw_case_row_redaction_style__", css);
}

/**
 * Hide developer-only overlays that float over the app so they don't appear in the recorded video.
 *
 * The app's own dev tools are suppressed by forcing dev-mode off (see setup/globalSetup), but the
 * TanStack React Query Devtools render their own floating toggle button (the logo in the
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
 * Expose a `window.__pwShowKey__(label)` helper that briefly pops up a keycap-styled badge at the
 * bottom of the screen, so a recorded video can show WHICH keyboard key was pressed (Playwright's
 * screencast never paints physical key presses). The badge pops in, holds, then fades out on its own.
 *
 * No-op unless RECORD=1. Must be called BEFORE `page.goto(...)` so the init script is registered for
 * the first navigation. Use together with {@link pressKeyWithOverlay}.
 */
export async function installKeyOverlay(page: Page): Promise<void> {
    if (!RECORDING) {
        return;
    }
    await page.addInitScript(() => {
        const STYLE_ID = "__pw_key_overlay_style__";

        function ensureKeyframes(): void {
            if (document.getElementById(STYLE_ID)) {
                return;
            }
            const style = document.createElement("style");
            style.id = STYLE_ID;
            style.textContent = `@keyframes __pw_key_pop__ {
                0%   { transform: translateX(-50%) scale(0.8); opacity: 0; }
                12%  { transform: translateX(-50%) scale(1);   opacity: 1; }
                80%  { transform: translateX(-50%) scale(1);   opacity: 1; }
                100% { transform: translateX(-50%) scale(0.96); opacity: 0; }
            }`;
            document.documentElement.appendChild(style);
        }

        function showKey(label: string): void {
            ensureKeyframes();
            const cap = document.createElement("div");
            cap.textContent = label;
            cap.style.cssText = [
                "position: fixed",
                "left: 50%",
                "bottom: 48px",
                "transform: translateX(-50%)",
                "min-width: 56px",
                "height: 56px",
                "padding: 0 18px",
                "display: flex",
                "align-items: center",
                "justify-content: center",
                "box-sizing: border-box",
                "font: 600 24px/1 system-ui, -apple-system, sans-serif",
                "color: #1a1a1a",
                "background: linear-gradient(#ffffff, #e7e7e7)",
                "border: 1px solid rgba(0, 0, 0, 0.25)",
                "border-bottom-width: 4px",
                "border-radius: 10px",
                "box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25)",
                "pointer-events: none",
                "z-index: 2147483647",
                "animation: __pw_key_pop__ 900ms ease-out forwards",
            ].join(";");
            document.documentElement.appendChild(cap);
            window.setTimeout(() => cap.remove(), 950);
        }

        (window as unknown as { __pwShowKey__?: (label: string) => void }).__pwShowKey__ = showKey;
    });
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
export async function smoothMoveToLocator(page: Page, locator: Locator): Promise<void> {
    if (!RECORDING) {
        return;
    }
    try {
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (box) {
            await glideMouseTo(page, box.x + box.width / 2, box.y + box.height / 2);
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
/** Friendly keycap labels for click modifiers, so modified clicks read clearly in recorded videos. */
const MODIFIER_OVERLAY_LABELS: Record<string, string> = {
    // Recordings run on Linux Desktop Chrome, so "ControlOrMeta" resolves to Control there.
    Control: "Ctrl",
    ControlOrMeta: "Ctrl",
    Meta: "\u2318",
    Shift: "Shift",
    Alt: "Alt",
};

export async function smoothClick(
    page: Page,
    locator: Locator,
    options?: Parameters<Locator["click"]>[0],
): Promise<void> {
    await smoothMoveToLocator(page, locator);
    if (RECORDING) {
        try {
            // When the click holds a modifier (e.g. Ctrl for multi-select), pop a keycap badge so the
            // recorded video shows the modifier is down — otherwise it looks like a plain click.
            // Requires installKeyOverlay(); the call is optional-chained so it's a no-op otherwise.
            const modifierLabels = (options?.modifiers ?? []).map((modifier) => MODIFIER_OVERLAY_LABELS[modifier] ?? modifier);
            if (modifierLabels.length > 0) {
                await page.evaluate(
                    (label) =>
                        (window as unknown as { __pwShowKey__?: (label: string) => void }).__pwShowKey__?.(label),
                    modifierLabels.join(" + "),
                );
            }
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
 * Like {@link smoothFill}, but when recording the text is typed one character at a time (with a
 * short per-key delay) so it visibly appears as if being typed instead of snapping in all at once.
 * Falls back to an instant `fill` when not recording to keep the regression run fast.
 */
export async function smoothType(page: Page, locator: Locator, value: string): Promise<void> {
    await smoothMoveToLocator(page, locator);
    await locator.click();
    await locator.fill("");
    if (!RECORDING) {
        await locator.fill(value);
        return;
    }
    await locator.pressSequentially(value, { delay: 45 });
}

/**
 * Where in the layout a dragged module should be dropped. `"center"` drops onto the middle of the
 * canvas (replacing an empty layout, or nesting into whatever box is under the centre); the four
 * side positions aim at the layout's edge drop zones so the module is split off to that side of the
 * existing content (e.g. `"right"` places it beside the current module, `"bottom"` beneath it).
 */
export type ModuleDropPosition = "center" | "left" | "right" | "top" | "bottom";

/**
 * How far (px) inside the layout edge to aim for the side drop positions. The layout's perimeter
 * drop zones are only ~50px wide, so a small fixed inset reliably lands in the edge zone (splitting
 * off the whole layout to that side) rather than nesting into a child box nearer the centre — which
 * is what a percentage-based target does once the canvas already holds a couple of modules.
 */
const DROP_EDGE_INSET_PX = 24;

/** Resolve the absolute (x, y) drop target within `layoutBox` for a given drop position. */
function resolveDropTarget(
    layoutBox: { x: number; y: number; width: number; height: number },
    dropPosition: ModuleDropPosition,
): { x: number; y: number } {
    const centerX = layoutBox.x + layoutBox.width / 2;
    const centerY = layoutBox.y + layoutBox.height / 2;
    switch (dropPosition) {
        case "left":
            return { x: layoutBox.x + DROP_EDGE_INSET_PX, y: centerY };
        case "right":
            return { x: layoutBox.x + layoutBox.width - DROP_EDGE_INSET_PX, y: centerY };
        case "top":
            return { x: centerX, y: layoutBox.y + DROP_EDGE_INSET_PX };
        case "bottom":
            return { x: centerX, y: layoutBox.y + layoutBox.height - DROP_EDGE_INSET_PX };
        default:
            return { x: centerX, y: centerY };
    }
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
 * `dropPosition` chooses where in the layout the module lands: the layout splits off a new region on
 * whichever edge the pointer dwells over, so aiming at an edge (rather than the centre) drops the
 * module beside/above/below the existing content instead of nesting into its middle.
 *
 * The gesture is retried until the module instance actually appears in the layout, because the
 * drop-preview timer can be reset by closely-spaced synthetic pointer moves and occasionally needs
 * another attempt to commit.
 */
export async function dragModuleOntoLayout(
    page: Page,
    moduleDisplayName: string,
    dropPosition: ModuleDropPosition = "center",
): Promise<void> {
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
        const { x: targetX, y: targetY } = resolveDropTarget(layoutBox, dropPosition);
        // Nudge the second dwell toward the layout centre so it stays inside the same edge zone even
        // when the target sits close to a boundary.
        const jiggleX = targetX + (targetX > layoutBox.x + layoutBox.width / 2 ? -3 : 3);
        const jiggleY = targetY + (targetY > layoutBox.y + layoutBox.height / 2 ? -3 : 3);

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
            await page.mouse.move(jiggleX, jiggleY, { steps: 3 });
            await page.waitForTimeout(700);
            await page.mouse.up();
            // Keep the tracked cursor position in sync so the next glide measures the right distance.
            lastMousePosition.set(page, { x: jiggleX, y: jiggleY });
        } catch (error) {
            // Make sure we never leave the mouse button pressed between retries.
            await page.mouse.up().catch(() => undefined);
            throw error;
        }

        await expect(droppedModule).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000, intervals: [1_000] });
}

/**
 * Slowly glide a slider's thumb from one end of the track to the other, so the motion is easy to
 * follow in a recorded tutorial. Playwright codegen can only capture discrete clicks on a slider,
 * which look abrupt; here we press the thumb at the start edge and drag it to the far edge with a
 * real mouse drag instead.
 *
 * `sliderControl` is the slider's pointer surface (base-ui `Slider.Control`, i.e. the full-width
 * clickable track area). `direction` chooses which way to sweep (`"right"` = min→max, the default;
 * `"left"` = max→min). The sweep position is driven by elapsed wall-clock time, so it lands close to
 * `durationMs` regardless of how many discrete time steps the slider snaps through — unlike stepping
 * key-by-key, whose per-press overhead makes the total balloon on sliders with many steps. Outside
 * recording it just clicks the destination end so the slider is still exercised without slowing the
 * regression run down.
 */
export async function sweepSliderAcross(
    page: Page,
    sliderControl: Locator,
    { durationMs = 6000, direction = "right" }: { durationMs?: number; direction?: "left" | "right" } = {},
): Promise<void> {
    await sliderControl.scrollIntoViewIfNeeded();
    const box = await sliderControl.boundingBox();
    if (!box) {
        return;
    }

    const y = box.y + box.height / 2;
    const leftX = box.x + 2;
    const rightX = box.x + box.width - 2;
    const fromX = direction === "right" ? leftX : rightX;
    const toX = direction === "right" ? rightX : leftX;

    if (!RECORDING) {
        // Outside recording, just jump to the destination end so the slider is still exercised.
        await page.mouse.click(toX, y);
        return;
    }

    // Grab the thumb at the start edge, then glide it to the far edge over the target duration.
    // Position is driven by elapsed wall-clock time (not a fixed number of fixed-delay steps), so the
    // sweep lands close to `durationMs` even though each move triggers a re-render; slow moves just
    // yield fewer, larger position jumps rather than a longer total.
    await glideMouseTo(page, fromX, y);
    await page.mouse.down();
    try {
        const start = Date.now();
        for (;;) {
            const progress = Math.min(1, (Date.now() - start) / durationMs);
            await page.mouse.move(fromX + (toX - fromX) * progress, y);
            if (progress >= 1) {
                break;
            }
            await page.waitForTimeout(16);
        }
        await page.mouse.up();
        // Keep the tracked cursor position in sync so the next glide measures the right distance.
        lastMousePosition.set(page, { x: toX, y });
    } catch (error) {
        // Never leave the mouse button pressed on failure.
        await page.mouse.up().catch(() => undefined);
        throw error;
    }
}

/**
 * Expand every collapsed node in a group-tree plot so all branches are visible. Collapsed nodes
 * render a "+ N child(ren)" label; clicking a node expands it, which can reveal further collapsed
 * descendants, so we keep clicking the first remaining collapsed label until none are left (bounded
 * so an animating/stuck tree can never loop forever).
 */
export async function expandAllGroupTreeNodes(page: Page, container: Locator): Promise<void> {
    const MAX_EXPANSIONS = 200;
    for (let i = 0; i < MAX_EXPANSIONS; i++) {
        const collapsed = container.getByText(/\+ \d+ child(ren)?/).first();
        if ((await collapsed.count()) === 0) {
            break;
        }
        await smoothClick(page, collapsed);
        // Let the expand animation / re-layout settle before looking for the next collapsed node.
        await page.waitForTimeout(150);
        await pace(page, "short");
    }
}

/**
 * Add a vector to the Simulation Time Series vector selector by typing its full name and confirming
 * with Enter, then asserting its tag appears. The vector tree may still be loading when the field is
 * first focused, so this retries the type-and-confirm until the tag shows up. `vectorName` uses the
 * selector's colon-separated form for well vectors, e.g. "FOPR" or "WGOR:A1".
 */
export async function addVectorToSelector(page: Page, vectorName: string): Promise<void> {
    const vectorSelectorContainer = page.getByTestId("vector-selector");
    await expect(vectorSelectorContainer).toBeVisible();
    const vectorInput = vectorSelectorContainer.locator("input").last();
    const vectorTag = vectorSelectorContainer.locator(`li[title="${vectorName}"]`);

    await smoothClick(page, vectorInput);
    await expect(async () => {
        if ((await vectorTag.count()) === 0) {
            await vectorInput.fill("");
            await vectorInput.pressSequentially(vectorName, { delay: 120 });
            await vectorInput.press("Enter");
        }
        await expect(vectorTag).toHaveCount(1);
    }).toPass({ timeout: 60_000, intervals: [1_000] });
}

/** Friendly on-screen glyphs for the keys we demo; falls back to the raw key name. */
const KEY_OVERLAY_LABELS: Record<string, string> = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Home: "Home",
    End: "End",
};

/**
 * Press `key` on `target` while (when recording) popping up a keycap badge showing which key was
 * pressed, so the action is visible in the tutorial video. Requires {@link installKeyOverlay} to
 * have been called before navigation. Waits `pauseMs` after each press (only while recording) so
 * consecutive keycaps read clearly and can be paced to match the narration.
 */
export async function pressKeyWithOverlay(
    page: Page,
    target: Locator,
    key: string,
    { label, pauseMs = 600 }: { label?: string; pauseMs?: number } = {},
): Promise<void> {
    if (RECORDING) {
        const shownLabel = label ?? KEY_OVERLAY_LABELS[key] ?? key;
        await page.evaluate(
            (l) => (window as unknown as { __pwShowKey__?: (label: string) => void }).__pwShowKey__?.(l),
            shownLabel,
        );
    }
    await target.press(key);
    if (RECORDING) {
        await page.waitForTimeout(pauseMs);
    }
}

/** Optional narration hooks for {@link createSessionAndSelectEnsemble}; default to no-ops. */
export type SessionAndEnsembleNarrationHooks = {
    narrate?: (text: string) => Promise<void>;
    markStep?: (title: string) => void;
    /** Further ensemble (iteration) names from the same Drogon case to add alongside the default one. */
    additionalEnsembleNames?: string[];
};

/**
 * Create a new session, then add and apply the Drogon AHM ensemble to it — the common setup shared
 * by every story that needs an ensemble loaded before it can show off its own module.
 *
 * `narrate`/`markStep` are opt-in: callers that want this flow narrated as its own part of a
 * recorded walkthrough (see the "Session and ensemble selection" story) pass the fixtures through;
 * callers that only need the setup done (e.g. other stories reusing this as a precondition) omit
 * them so no narration/step is recorded for these actions.
 *
 * `additionalEnsembleNames` lets a story load more than one ensemble from the same case (e.g. to
 * compare iterations); the "Ensembles in selected case" list is multi-select, so each extra name is
 * simply clicked before applying.
 */
export async function createSessionAndSelectEnsemble(
    page: Page,
    {
        narrate = async () => undefined,
        markStep = () => undefined,
        additionalEnsembleNames = [],
    }: SessionAndEnsembleNarrationHooks = {},
): Promise<void> {
    const newSessionNarration = narrate("Let's start by creating a new session...");
    markStep("Create a session");
    await smoothClick(page, page.getByRole("button", { name: "New session" }));
    await newSessionNarration;

    const ensembleNarration = narrate(
        "...and then add an ensemble. The Drogon asset is already selected, so we just check that the case we want is the one shown, and select it.",
    );
    markStep("Add the Drogon ensemble");
    await expect(page.getByText("Ensembles used in this session")).toBeVisible({ timeout: 60_000 });
    await smoothClick(page, page.getByTestId("add-regular-ensemble-button"));
    await pace(page);

    // The test user only has access to one asset (Drogon), so it is already selected. Just glide the
    // cursor over the Asset selector to point it out — opening it would leave the dropdown covering
    // the case filter below.
    await smoothMoveToLocator(page, page.getByRole("combobox", { name: "Asset" }));
    await pace(page);

    // Filter the case table by the test case UUID. The Asset dropdown is never opened, so its own
    // "Filter ..." search field isn't present and this reliably targets the Case (ID) column filter.
    await smoothFill(page, page.getByPlaceholder("Filter ...").first(), DROGON_AHM.caseUuid);
    await expect(page.getByText(DROGON_AHM.caseUuid)).toBeVisible({ timeout: 60_000 });
    await pace(page);

    await smoothClick(
        page,
        page
            .locator("tbody")
            .getByRole("row", { name: new RegExp(DROGON_AHM.caseUuid) })
            .first(),
    );

    await expect(page.getByText(DROGON_AHM.ensembleName).first()).toBeVisible({ timeout: 60_000 });
    await ensembleNarration;
    await pace(page);

    const applyNarration = narrate("We select the ensemble and apply it to load it into the session.");
    markStep("Apply the ensemble");
    await smoothClick(page, page.getByText(DROGON_AHM.ensembleName).first());

    // The "Ensembles in selected case" list is multi-select, so add any further iterations by
    // simply clicking their rows before applying.
    for (const additionalEnsembleName of additionalEnsembleNames) {
        await smoothClick(page, page.getByText(additionalEnsembleName).first());
    }

    await smoothClick(page, page.getByRole("button", { name: "Apply" }).last());
    await pace(page);

    await smoothClick(page, page.getByRole("button", { name: "Apply" }));
    await expect(page.getByText("Ensembles used in this session")).not.toBeVisible({ timeout: 120_000 });
    await applyNarration;
}
