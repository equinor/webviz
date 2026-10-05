import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { Plugin } from "vite";

/**
 * TEMPORARY workaround for a WebGL-context leak in plotly.js.
 *
 * plotly.js (3.6.0) removes its `<canvas class="gl-canvas">` elements in `Plots.cleanPlot`
 * (whenever `Plotly.react` rebuilds the gl layer) and in `Plots.purge` (on unmount), but never
 * releases the underlying WebGL context - no `regl.destroy()`, no `WEBGL_lose_context`. Each
 * teardown orphans two contexts (`context` + `focus` layers); the browser's ~16-context budget
 * is exhausted within a handful of interactions, after which every gl plot in the app dies with
 * "WebGL is not supported in your browser".
 *
 * Reported upstream: https://github.com/plotly/plotly.js/issues/6365#issuecomment-5493339463
 *
 * react-plotly.js pulls the prebuilt UMD bundle `plotly.js/dist/plotly`, and `Plots.cleanPlot`
 * is not on plotly's public API, so this can't be fixed by monkey-patching at runtime. We also
 * can't use `patch-package` (the dev container installs with `npm ci --ignore-scripts`). So this
 * plugin writes a patched copy of the bundle next to the original and aliases the import to it.
 * The copy is regenerated every time Vite starts, so it survives `npm ci`.
 *
 * It must be registered in every Vite config that bundles the plotly.js *runtime* (the UMD bundle
 * at `plotly.js/dist/plotly`): vite.config.ts (app), playwright.ct.config.ts (component tests) and
 * .storybook/main.ts (Storybook). vitest.config.ts is deliberately left out - the unit tests only
 * `import type` from plotly.js, which is erased at compile time and never pulls the runtime bundle.
 *
 * Remove this plugin (and its registration in the three configs above) once the upstream fix is
 * released and we bump plotly.js.
 */

const PLOTLY_DIST_SPECIFIER = "plotly.js/dist/plotly";
const PATCHED_BASENAME = "plotly.webviz-webgl-context-release.js";

// The bundle layout this patch was written against. `plotly.js` is pinned to this exact version in
// package.json; if you deliberately bump it, re-check the two regexes below against the new
// `dist/plotly.js` and update this constant.
const EXPECTED_PLOTLY_VERSION = "3.6.0";

// Inserted immediately before each `.gl-canvas` removal: destroy the regl instance and force the
// browser to reclaim the WebGL context instead of waiting for GC.
//
// `loseContext()` fires a `webglcontextlost` event which plotly forwards as `plotly_webglcontextlost`.
// That is indistinguishable from a real browser eviction, so we stamp the canvas first; the app's
// `onWebGlContextLost` handler ignores losses on a stamped canvas (see Plot.tsx).
function releaseSnippet(layoutVar: string): string {
    return (
        `if(${layoutVar}._glcanvas&&${layoutVar}._glcanvas.each){` +
        `${layoutVar}._glcanvas.each(function(d){` +
        `if(d&&d.regl){try{d.regl.destroy()}catch(e){}}` +
        `try{` +
        `this.__webvizContextReleased=true;` +
        `var _gl=this.getContext&&(this.getContext("webgl")||this.getContext("webgl2"));` +
        `var _lose=_gl&&_gl.getExtension&&_gl.getExtension("WEBGL_lose_context");` +
        `if(_lose)_lose.loseContext()` +
        `}catch(e){}` +
        `})}`
    );
}

const SITE_CLEAN_PLOT =
    /(if \(hadGl && !hasGl\) \{\s*if \(oldFullLayout\._glcontainer !== void 0\) \{\s*)(oldFullLayout\._glcontainer\.selectAll\(["']\.gl-canvas["']\)\.remove\(\);)/;

const SITE_PURGE =
    /(plots\.purge = function\(gd\) \{\s*var fullLayout = gd\._fullLayout \|\| \{\};\s*if \(fullLayout\._glcontainer !== void 0\) \{\s*)(fullLayout\._glcontainer\.selectAll\(["']\.gl-canvas["']\)\.remove\(\);)/;

export function patchPlotlySource(code: string): string {
    let patched = code;
    let hits = 0;

    if (SITE_CLEAN_PLOT.test(patched)) {
        patched = patched.replace(
            SITE_CLEAN_PLOT,
            (_m, head: string, tail: string) => head + releaseSnippet("oldFullLayout") + tail,
        );
        hits++;
    }
    if (SITE_PURGE.test(patched)) {
        patched = patched.replace(
            SITE_PURGE,
            (_m, head: string, tail: string) => head + releaseSnippet("fullLayout") + tail,
        );
        hits++;
    }

    if (hits !== 2) {
        throw new Error(
            `[plotly-webgl-context-release] expected to patch 2 call sites in ${PLOTLY_DIST_SPECIFIER}, ` +
                `patched ${hits}. plotly.js has likely changed - review this plugin against the new source ` +
                `and update it, or drop the plugin if the upstream fix has landed.`,
        );
    }

    return patched;
}

export function plotlyWebglContextReleasePlugin(): Plugin {
    return {
        name: "plotly-webgl-context-release",

        config(_config, { command }) {
            const require = createRequire(import.meta.url);

            const installedVersion = require("plotly.js/package.json").version as string;
            if (installedVersion !== EXPECTED_PLOTLY_VERSION) {
                throw new Error(
                    `[plotly-webgl-context-release] this patch targets plotly.js@${EXPECTED_PLOTLY_VERSION}, ` +
                        `but plotly.js@${installedVersion} is installed. Re-check the patch against the new bundle ` +
                        `and update EXPECTED_PLOTLY_VERSION, or remove this plugin if the upstream fix has landed.`,
                );
            }

            const originalPath = require.resolve(`${PLOTLY_DIST_SPECIFIER}.js`);
            const patchedPath = path.join(path.dirname(originalPath), PATCHED_BASENAME);

            const source = fs.readFileSync(originalPath, "utf8");
            const patched = patchPlotlySource(source);

            // Only touch the file when its contents actually change, so we don't wake file watchers
            // or invalidate the dep-optimizer cache on every start.
            let current: string | null = null;
            try {
                current = fs.readFileSync(patchedPath, "utf8");
            } catch {
                current = null;
            }
            if (current !== patched) {
                fs.writeFileSync(patchedPath, patched);

                console.info(
                    `[plotly-webgl-context-release] wrote patched plotly bundle for \`${command}\` -> ${path.relative(process.cwd(), patchedPath)}`,
                );
            }

            return {
                resolve: {
                    alias: [{ find: /^plotly\.js\/dist\/plotly(\.js)?$/, replacement: patchedPath }],
                },
            };
        },
    };
}

export default plotlyWebglContextReleasePlugin;
