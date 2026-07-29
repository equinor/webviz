import type { SeismicFencePolyline_api } from "@api";

/**
 * Create seismic fence polyline object from polyline XY coordinates.
 *
 * Takes a polyline xy coordinates array, where the x and y coordinates are interleaved,
 * and returns a seismic fence polyline object.
 */
export function createSeismicFencePolylineFromPolylineXy(polylineXy: readonly number[]): SeismicFencePolyline_api {
    const xPoints: number[] = [];
    const yPoints: number[] = [];

    for (let i = 0; i < polylineXy.length; i += 2) {
        xPoints.push(polylineXy[i]);
        yPoints.push(polylineXy[i + 1]);
    }

    return { x_points: xPoints, y_points: yPoints };
}

/**
 * Utility function to convert the 1D array of values from the fence data to a 2D array of values
 * for the seismic slice image.
 *
 * For the bit map image, the values are provided such that a seismic trace is a column in the image,
 * thus the data will be transposed.
 *
 * trace a,b,c and d
 *
 * fenceTracesArray = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 * numTraces = 4
 * numSamplesPerTrace = 3
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
export function createSeismicSliceImageDatapointsArrayFromFenceTracesArray(
    fenceTracesArray: Float32Array,
    numTraces: number,
    numSamplesPerTrace: number,
    fillValue = 0,
): number[][] {
    const datapoints: number[][] = [];
    for (let i = 0; i < numSamplesPerTrace; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamplesPerTrace;
            const fenceValue = fenceTracesArray[index];
            const validFenceValue = Number.isNaN(fenceValue) ? fillValue : fenceValue;
            row.push(validFenceValue);
        }
        datapoints.push(row);
    }
    return datapoints;
}

/**
 * Utility to create an array of values for the Y axis of the seismic slice image. I.e. depth values
 * for the seismic depth axis.
 */
export function createSeismicSliceImageYAxisValuesArrayForFence(
    numSamplesPerTrace: number,
    minFenceDepth: number,
    maxFenceDepth: number,
): number[] {
    const yAxisValues: number[] = [];
    for (let i = 0; i < numSamplesPerTrace; ++i) {
        yAxisValues.push(minFenceDepth + ((maxFenceDepth - minFenceDepth) / numSamplesPerTrace) * i);
    }
    return yAxisValues;
}
