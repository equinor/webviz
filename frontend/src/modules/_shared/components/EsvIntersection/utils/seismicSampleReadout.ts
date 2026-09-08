import { clamp, sortedIndexBy } from "lodash-es";

import { sampleSeismicGrid } from "@modules/_shared/Intersection/seismicGridSampling";

import type { SeismicLayerData } from "../layers/SeismicLayer";

export type SeismicSampleReadout = {
    /** Bilinear blend of the four surrounding samples — matches the rendered image. */
    interpolatedValue: number;
    /** Value of the single nearest sample. Raw: `NaN` when that sample is missing in the backend data. */
    nearestValue: number;
    /** Trace/sample indices of the nearest sample. */
    nearestTraceIndex: number;
    nearestSampleIndex: number;
    /** World-space `[x, depth]` position of the nearest sample. */
    nearestSamplePoint: [number, number];
};

/**
 * Given a world point over a seismic fence layer, resolve the seismic value both by bilinear
 * interpolation and by snapping to the nearest stored sample, and report where that nearest
 * sample sits in world space so it can be highlighted.
 *
 * Returns `null` when the layer data is not usable (fewer than two trace projection vertices).
 */
export function computeSeismicSampleReadout(
    seismicData: SeismicLayerData,
    point: number[],
): SeismicSampleReadout | null {
    const fenceProjection = seismicData.trajectoryFenceProjection ?? [];
    if (fenceProjection.length < 2) {
        return null;
    }

    const x = point[0];
    const y = point[1];

    const fenceDepthSpan = Math.abs(seismicData.maxFenceDepth - seismicData.minFenceDepth);
    const rowHeight = fenceDepthSpan / seismicData.numSamplesPerTrace;

    // Samples are evenly spaced between min and max fence depth, so the fractional sample
    // index is a plain linear mapping.
    const sampleCoord = (y - seismicData.minFenceDepth) / rowHeight;

    // Traces sit at the vertices of the fence-polyline projection, which are not evenly spaced
    // (per-section resampling leaves a shorter remainder at each original vertex). Mirror
    // SeismicLayer's rendering: find the projection segment containing x and take the fraction from
    // that segment's end points instead of assuming a uniform trace width.
    const trace1 = clamp(
        sortedIndexBy(fenceProjection, [x], (p) => p[0]),
        1,
        fenceProjection.length - 1,
    );
    const trace0 = trace1 - 1;
    const traceSpan = fenceProjection[trace1][0] - fenceProjection[trace0][0];
    const traceFrac = traceSpan > 0 ? clamp((x - fenceProjection[trace0][0]) / traceSpan, 0, 1) : 0;
    const traceCoord = trace0 + traceFrac;

    const sample = sampleSeismicGrid(
        (traceNum, sampleNum) =>
            seismicData.fenceTracesArray[traceNum * seismicData.numSamplesPerTrace + sampleNum],
        fenceProjection.length,
        seismicData.numSamplesPerTrace,
        traceCoord,
        sampleCoord,
    );

    return {
        interpolatedValue: sample.interpolatedValue,
        nearestValue: sample.nearestValue,
        nearestTraceIndex: sample.nearestTraceIndex,
        nearestSampleIndex: sample.nearestSampleIndex,
        nearestSamplePoint: [
            fenceProjection[sample.nearestTraceIndex][0],
            seismicData.minFenceDepth + sample.nearestSampleIndex * rowHeight,
        ],
    };
}
