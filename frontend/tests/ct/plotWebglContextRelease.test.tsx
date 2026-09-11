import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";

import { PlotWebglHarness } from "./support/PlotWebglHarness";

/**
 * Cross-browser coverage for the Vite-injected plotly WebGL-context-release patch
 * (`vite-plugin-plotly-webgl-context-release`). Runs on every project configured in
 * `playwright.ct.config.ts` (chromium, firefox, webkit) - all three expose real WebGL,
 * `WEBGL_lose_context` and a synchronous `isContextLost()` in the CT runner.
 *
 * plotly 3.6.0 removes its `<canvas class="gl-canvas">` elements (in `Plots.cleanPlot` on the
 * has-gl -> no-gl transition, and in `Plots.purge` on unmount) without ever releasing the WebGL
 * context. The patch calls `regl.destroy()` + `WEBGL_lose_context.loseContext()` at those two
 * sites and stamps the canvas so the app's `onWebGlContextLost` handler ignores the self-inflicted
 * loss. These tests exercise both sites and assert that live contexts stay bounded.
 */

const OVERLAY_TEXT = "The browser has stopped this visualization.";

type GlStats = { created: number; loseContextCalls: number; live: number };

/**
 * Installed with `page.evaluate` before the first `mount()` (which is what pulls in plotly and
 * creates the plot). Wraps `HTMLCanvasElement.prototype.getContext` to record every WebGL context
 * created and to count `WEBGL_lose_context.loseContext()` calls.
 *
 * NB: the CT runner has already navigated the harness page by the time the test body runs, so
 * `page.addInitScript` would only take effect after a reload - `page.evaluate` before `mount()` is
 * what gets this in ahead of plotly.
 */
function instrumentWebglContexts(): void {
    type Stats = { created: number; loseContextCalls: number; contexts: WebGLRenderingContext[] };
    const holder = window as unknown as { __webvizGlStats?: Stats };
    if (holder.__webvizGlStats) return;

    const stats: Stats = { created: 0, loseContextCalls: 0, contexts: [] };
    holder.__webvizGlStats = stats;

    const GL_TYPES = ["webgl", "webgl2", "experimental-webgl"];
    const origGetContext = HTMLCanvasElement.prototype.getContext as (
        this: HTMLCanvasElement,
        ...args: unknown[]
    ) => unknown;

    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
        this: HTMLCanvasElement,
        ...args: unknown[]
    ): unknown {
        const result = origGetContext.apply(this, args);
        if (!result || !GL_TYPES.includes(String(args[0]))) return result;

        const gl = result as WebGLRenderingContext & { __webvizSeen?: boolean };
        if (gl.__webvizSeen) return result;
        gl.__webvizSeen = true;
        stats.created++;
        stats.contexts.push(gl);

        const origGetExtension = gl.getExtension.bind(gl) as (name: string) => unknown;
        gl.getExtension = function patchedGetExtension(name: string): unknown {
            const ext = origGetExtension(name);
            const loseExt = ext as ({ loseContext(): void; __webvizWrapped?: boolean }) | null;
            if (name === "WEBGL_lose_context" && loseExt && !loseExt.__webvizWrapped) {
                loseExt.__webvizWrapped = true;
                const origLose = loseExt.loseContext.bind(loseExt);
                loseExt.loseContext = function countedLoseContext(): void {
                    stats.loseContextCalls++;
                    origLose();
                };
            }
            return ext;
        } as typeof gl.getExtension;

        return result;
    } as typeof HTMLCanvasElement.prototype.getContext;
}

function readGlStats(page: Page): Promise<GlStats> {
    return page.evaluate(() => {
        const stats = (window as unknown as {
            __webvizGlStats: { created: number; loseContextCalls: number; contexts: WebGLRenderingContext[] };
        }).__webvizGlStats;
        return {
            created: stats.created,
            loseContextCalls: stats.loseContextCalls,
            live: stats.contexts.filter((ctx) => !ctx.isContextLost()).length,
        };
    });
}

const glCanvasCount = (page: Page): Promise<number> =>
    page.evaluate(() => document.querySelectorAll("canvas.gl-canvas").length);

const afterPlotCount = (page: Page): Promise<number> =>
    page.evaluate(() => (window as unknown as { __webvizAfterPlotCount?: number }).__webvizAfterPlotCount ?? 0);

test.describe("plotly WebGL context release", () => {
    test.slow(); // plotly bundle + repeated react()/purge cycles are heavy, especially on webkit

    test("toggling scattergl traces on/off repeatedly releases contexts instead of leaking", async ({
        mount,
        page,
    }) => {
        await page.evaluate(instrumentWebglContexts);

        const cmp = await mount(<PlotWebglHarness traceType="scattergl" />);
        await expect.poll(() => glCanvasCount(page)).toBeGreaterThanOrEqual(1);
        await expect.poll(() => readGlStats(page).then((s) => s.created)).toBeGreaterThan(0);

        const baseline = await readGlStats(page);

        const CYCLES = 10;
        for (let i = 0; i < CYCLES; i++) {
            await cmp.getByTestId("toggle-gl").click(); // -> no traces: plotly tears the gl layer down
            await expect.poll(() => glCanvasCount(page)).toBe(0);
            await cmp.getByTestId("toggle-gl").click(); // -> scattergl again: gl layer rebuilt
            await expect.poll(() => glCanvasCount(page)).toBeGreaterThanOrEqual(1);
        }

        const after = await readGlStats(page);

        // The patch releases a context on every teardown - one per has-gl -> no-gl transition, at least.
        expect(after.loseContextCalls).toBeGreaterThanOrEqual(CYCLES);
        // Churn really did create fresh contexts each rebuild ...
        expect(after.created).toBeGreaterThan(baseline.created);
        // ... yet the number of *live* contexts never grows with the churn.
        expect(after.live).toBeLessThanOrEqual(baseline.live + 2);

        // The self-inflicted context loss is never surfaced to the user as a crash.
        await expect(page.getByText(OVERLAY_TEXT, { exact: true })).toBeHidden();

        // Plot is still alive and applying data updates.
        await cmp.getByTestId("bump").click();
        await expect(cmp.getByTestId("seed")).toHaveText("1");
        await expect(page.locator("canvas.gl-canvas").first()).toBeAttached();
    });

    test("repeated data updates and remounts keep the scattergl plot healthy", async ({ mount, page }) => {
        await page.evaluate(instrumentWebglContexts);

        const cmp = await mount(<PlotWebglHarness traceType="scattergl" />);
        await expect.poll(() => glCanvasCount(page)).toBeGreaterThanOrEqual(1);
        await expect.poll(() => readGlStats(page).then((s) => s.created)).toBeGreaterThan(0);

        const baseline = await readGlStats(page);

        // Plain data updates - a scattergl trace stays present, so the gl layer is not torn down.
        // Synchronize on plotly's own `plotly_afterplot` so each update is fully flushed before the
        // next click, then assert that no new WebGL context was created across the whole loop: a
        // correct `Plotly.react()` data update reuses the live regl context. If the wrapper's
        // `config` object regressed to a fresh reference per render, plotly would fall back to a
        // full `Plotly.newPlot()` on every bump - tearing down and recreating the context each time
        // (which the release patch would still keep `live` bounded, so `created` is what catches it).
        for (let i = 0; i < 6; i++) {
            const before = await afterPlotCount(page);
            await cmp.getByTestId("bump").click();
            await expect(cmp.getByTestId("seed")).toHaveText(String(i + 1));
            await expect.poll(() => afterPlotCount(page)).toBeGreaterThan(before);
        }
        const afterBumps = await readGlStats(page);
        expect(afterBumps.created).toBe(baseline.created);
        expect(afterBumps.loseContextCalls).toBe(baseline.loseContextCalls);
        expect(afterBumps.live).toBeLessThanOrEqual(baseline.live + 2);

        // Full unmount/remount - the Plots.purge path.
        for (let i = 0; i < 5; i++) {
            await cmp.getByTestId("remount").click();
            await expect.poll(() => glCanvasCount(page)).toBeGreaterThanOrEqual(1);
        }

        const after = await readGlStats(page);

        expect(after.loseContextCalls).toBeGreaterThan(0); // purge released the old plot's contexts
        expect(after.live).toBeLessThanOrEqual(baseline.live + 2);

        await expect(page.getByText(OVERLAY_TEXT, { exact: true })).toBeHidden();
        await expect(page.locator("canvas.gl-canvas").first()).toBeAttached();
    });
});
