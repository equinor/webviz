import React from "react";

import { Plot } from "@modules/_shared/components/Plot/plot";

type Props = {
    /** Trace type for the data series. Component tests exercise `"scattergl"`. */
    traceType?: "scattergl" | "scatter";
};

const X = Array.from({ length: 40 }, (_, i) => i);

function makeTrace(traceType: "scattergl" | "scatter", seed: number): Partial<Plotly.Data> {
    return {
        type: traceType,
        mode: "lines",
        x: X,
        y: X.map((x) => Math.sin((x + seed) / 4) + seed * 0.01),
        name: `series ${seed}`,
    };
}

/**
 * Browser-side harness for component-testing the shared {@link Plot} wrapper against the
 * Vite-injected plotly WebGL-context-release patch (`vite-plugin-plotly-webgl-context-release`).
 *
 * - `bump` changes the trace values while keeping a `scattergl` trace present (a plain
 *   `Plotly.react` data update).
 * - `toggle-gl` flips between "one `scattergl` trace" and "no traces", which is what makes plotly
 *   tear down and later rebuild its shared WebGL layer - the churn that leaked contexts before the
 *   patch.
 * - `remount` unmounts and remounts the whole plot (the `Plots.purge` path).
 * - `window.__webvizAfterPlotCount` is bumped on every plotly `plotly_afterplot`, so a test can wait
 *   for a data update to be flushed into plotly before inspecting WebGL state. It is a plain counter
 *   (not React state) on purpose - reflecting it back into render would create a feedback loop when
 *   the wrapper's plot props are unstable, which is one of the regressions these tests guard against.
 *
 * An `onDownloadClick` handler is always passed: it makes {@link Plot} put a `click` closure into
 * plotly's `config`, and `Plotly.react()` compares `config` by value and treats a fresh closure as
 * a config change - which forces a full `Plotly.newPlot()` (WebGL contexts torn down and rebuilt).
 * The wrapper is expected to memoize that config so plain data updates do not churn it; the
 * "data updates ... keep the scattergl plot healthy" test asserts exactly that.
 */
export function PlotWebglHarness(props: Props): React.JSX.Element {
    const traceType = props.traceType ?? "scattergl";

    const [seed, setSeed] = React.useState(0);
    const [hasTraces, setHasTraces] = React.useState(true);
    const [mountKey, setMountKey] = React.useState(0);

    // Bumped from plotly's `plotly_afterplot` event so tests can synchronize on the point where a
    // data update has actually been flushed into plotly (a plain `Plotly.react()` or a full
    // `Plotly.newPlot()` both fire it), rather than only on the React state change. Deliberately a
    // window-scoped counter and not React state - see the component doc comment.
    const handleAfterPlot = React.useCallback(() => {
        const holder = window as unknown as { __webvizAfterPlotCount?: number };
        holder.__webvizAfterPlotCount = (holder.__webvizAfterPlotCount ?? 0) + 1;
    }, []);

    // Puts a `click` closure into plotly's `config` - see the component doc comment.
    const handleDownloadClick = React.useCallback(() => undefined, []);

    const data = React.useMemo<Partial<Plotly.Data>[]>(
        () => (hasTraces ? [makeTrace(traceType, seed)] : []),
        [traceType, seed, hasTraces],
    );

    return (
        <div style={{ width: 600, height: 460 }}>
            <button data-testid="bump" onClick={() => setSeed((v) => v + 1)}>
                bump
            </button>
            <button data-testid="toggle-gl" onClick={() => setHasTraces((v) => !v)}>
                toggle-gl
            </button>
            <button data-testid="remount" onClick={() => setMountKey((v) => v + 1)}>
                remount
            </button>
            <div data-testid="seed">{seed}</div>

            <div style={{ width: 600, height: 400 }}>
                <Plot
                    key={mountKey}
                    data={data}
                    onAfterPlot={handleAfterPlot}
                    onDownloadClick={handleDownloadClick}
                    style={{ width: "100%", height: "100%" }}
                />
            </div>
        </div>
    );
}
