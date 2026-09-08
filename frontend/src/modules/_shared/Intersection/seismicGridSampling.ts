import { clamp } from "lodash-es";

export type SeismicGridSample = {
    /** Bilinear blend of the four surrounding samples — matches how the seismic image is rendered. */
    interpolatedValue: number;
    /**
     * Raw value of the single nearest stored sample. Not NaN-substituted: a missing sample reads
     * as `NaN` so callers can show it as missing rather than as `0`.
     */
    nearestValue: number;
    /** Integer indices of the nearest stored sample. */
    nearestTraceIndex: number;
    nearestSampleIndex: number;
    /** The (clamped) continuous indices that were sampled. */
    traceCoord: number;
    sampleCoord: number;
};

/**
 * Sample a regular `trace × sample` seismic grid at continuous (fractional) indices, returning both
 * the bilinearly interpolated value and the value of the nearest stored sample.
 *
 * This is the geometry-agnostic core shared by every seismic readout: callers are responsible for
 * mapping their own coordinate space (an ESV fence x/depth, a 3D pick, an inline/crossline index)
 * to `traceCoord` / `sampleCoord`, and for mapping the returned nearest indices back if they need a
 * position to highlight.
 *
 * Missing samples (stored as `NaN`) are treated as `0` for the interpolation — mirroring the image
 * pipeline (see `createSeismicSliceImageDatapointsArrayFromFenceTracesArray`) — but are returned
 * verbatim as `nearestValue`.
 *
 * @param getSample Raw sample lookup `(traceIndex, sampleIndex) => value`; may return `NaN`.
 * @param numTraces Number of traces in the grid (>= 1).
 * @param numSamplesPerTrace Number of samples per trace (>= 1).
 * @param traceCoord Continuous trace index; clamped to `[0, numTraces - 1]`.
 * @param sampleCoord Continuous sample index; clamped to `[0, numSamplesPerTrace - 1]`.
 */
export function sampleSeismicGrid(
    getSample: (traceIndex: number, sampleIndex: number) => number,
    numTraces: number,
    numSamplesPerTrace: number,
    traceCoord: number,
    sampleCoord: number,
): SeismicGridSample {
    const clampedTraceCoord = clamp(traceCoord, 0, numTraces - 1);
    const clampedSampleCoord = clamp(sampleCoord, 0, numSamplesPerTrace - 1);

    const trace0 = Math.floor(clampedTraceCoord);
    const trace1 = Math.min(trace0 + 1, numTraces - 1);
    const traceFrac = clampedTraceCoord - trace0;

    const sample0 = Math.floor(clampedSampleCoord);
    const sample1 = Math.min(sample0 + 1, numSamplesPerTrace - 1);
    const sampleFrac = clampedSampleCoord - sample0;

    const interpValueAt = (traceNum: number, sampleNum: number) => {
        const sample = getSample(traceNum, sampleNum);
        return Number.isNaN(sample) ? 0 : sample;
    };

    // Bilinear interpolation between the four surrounding samples.
    const top =
        interpValueAt(trace0, sample0) + (interpValueAt(trace1, sample0) - interpValueAt(trace0, sample0)) * traceFrac;
    const bottom =
        interpValueAt(trace0, sample1) + (interpValueAt(trace1, sample1) - interpValueAt(trace0, sample1)) * traceFrac;
    const interpolatedValue = top + (bottom - top) * sampleFrac;

    // Nearest-sample readout: snap to whichever surrounding sample the coordinate is closest to
    // along each axis, and report the raw value so a missing sample reads as missing.
    const nearestTraceIndex = traceFrac < 0.5 ? trace0 : trace1;
    const nearestSampleIndex = sampleFrac < 0.5 ? sample0 : sample1;

    return {
        interpolatedValue,
        nearestValue: getSample(nearestTraceIndex, nearestSampleIndex),
        nearestTraceIndex,
        nearestSampleIndex,
        traceCoord: clampedTraceCoord,
        sampleCoord: clampedSampleCoord,
    };
}
