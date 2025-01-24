import {
    SeismicCrosslineData_trans,
    SeismicInlineData_trans,
} from "@modules/3DViewerNew/settings/queries/queryDataTransforms";

export type SeismicInlineLayerData = {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
    propertyFloat32Arr: Float32Array;
    minValue: number;
    maxValue: number;
};
export type SeismicCrosslineLayerData = {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
    propertyFloat32Arr: Float32Array;
    minValue: number;
    maxValue: number;
};
type Point = { x: number; y: number };

function interpolatePoints(start: Point, end: Point, numSamples: number): Point[] {
    const result: Point[] = [];

    const intervalX = (end.x - start.x) / (numSamples - 1);

    for (let i = 0; i < numSamples; i++) {
        const x = start.x + i * intervalX;
        const y = start.y + ((x - start.x) / (end.x - start.x)) * (end.y - start.y);
        result.push({ x, y });
    }

    return result;
}
export function createSeismicInlineLayerData(seismicInlineData: SeismicInlineData_trans): SeismicInlineLayerData {
    const origPoint: Point = { x: seismicInlineData.start_utm_x, y: seismicInlineData.start_utm_y };
    const endPoint: Point = { x: seismicInlineData.end_utm_x, y: seismicInlineData.end_utm_y };
    const numSamples = seismicInlineData.crossline_no_samples;
    const interpolatedPointsXY = interpolatePoints(origPoint, endPoint, numSamples);

    const minDepth = seismicInlineData.z_min;
    const maxDepth = seismicInlineData.z_max;
    const depthSamples = seismicInlineData.z_samples;

    const cellCountU = interpolatedPointsXY.length - 1;
    const cellCountV = depthSamples - 1;

    const depthIncrement = (maxDepth - minDepth) / depthSamples;
    const pointsFloat32Arr = new Float32Array((cellCountU + 1) * (cellCountV + 1) * 3);
    const polysUint32Arr = new Uint32Array(cellCountU * cellCountV * 5); // 5 = 4 vertices + polygon count

    let pointIndex = 0;
    let polygonIndex = 0;

    for (let j = 0; j <= cellCountV; j++) {
        for (let i = 0; i <= cellCountU; i++) {
            pointsFloat32Arr[pointIndex++] = interpolatedPointsXY[i].x;
            pointsFloat32Arr[pointIndex++] = interpolatedPointsXY[i].y;
            pointsFloat32Arr[pointIndex++] = minDepth + j * depthIncrement;

            if (i < cellCountU && j < cellCountV) {
                polysUint32Arr[polygonIndex++] = 4;
                polysUint32Arr[polygonIndex++] = i + j * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + 1 + j * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + 1 + (j + 1) * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + (j + 1) * (cellCountU + 1);
            }
        }
    }
    const propertyArr = seismicInlineData.dataFloat32Arr;
    const transposedPropertyArr = [];
    for (let j = 0; j < depthSamples; j++) {
        for (let i = 0; i < cellCountU; i++) {
            transposedPropertyArr.push(propertyArr[i * depthSamples + j]);
        }
    }
    const chunkSize = 10000;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < transposedPropertyArr.length; i += chunkSize) {
        const chunk = transposedPropertyArr.slice(i, i + chunkSize);
        const chunkMin = Math.min(...chunk);
        const chunkMax = Math.max(...chunk);

        if (chunkMin < minValue) minValue = chunkMin;
        if (chunkMax > maxValue) maxValue = chunkMax;
    }
    return {
        pointsFloat32Arr,
        polysUint32Arr,
        propertyFloat32Arr: new Float32Array(transposedPropertyArr),
        minValue,
        maxValue,
    };
}
export function createSeismicCrosslineLayerData(
    seismicCrosslineData: SeismicCrosslineData_trans
): SeismicCrosslineLayerData {
    const origPoint: Point = { x: seismicCrosslineData.start_utm_x, y: seismicCrosslineData.start_utm_y };
    const endPoint: Point = { x: seismicCrosslineData.end_utm_x, y: seismicCrosslineData.end_utm_y };
    const numSamples = seismicCrosslineData.inline_no_samples;
    const interpolatedPointsXY = interpolatePoints(origPoint, endPoint, numSamples);

    const minDepth = seismicCrosslineData.z_min;
    const maxDepth = seismicCrosslineData.z_max;
    const depthSamples = seismicCrosslineData.z_samples;

    const cellCountU = interpolatedPointsXY.length - 1;
    const cellCountV = depthSamples - 1;

    const depthIncrement = (maxDepth - minDepth) / depthSamples;
    const pointsFloat32Arr = new Float32Array((cellCountU + 1) * (cellCountV + 1) * 3);
    const polysUint32Arr = new Uint32Array(cellCountU * cellCountV * 5); // 5 = 4 vertices + polygon count

    let pointIndex = 0;
    let polygonIndex = 0;

    for (let j = 0; j <= cellCountV; j++) {
        for (let i = 0; i <= cellCountU; i++) {
            pointsFloat32Arr[pointIndex++] = interpolatedPointsXY[i].x;
            pointsFloat32Arr[pointIndex++] = interpolatedPointsXY[i].y;
            pointsFloat32Arr[pointIndex++] = minDepth + j * depthIncrement;

            if (i < cellCountU && j < cellCountV) {
                polysUint32Arr[polygonIndex++] = 4;
                polysUint32Arr[polygonIndex++] = i + j * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + 1 + j * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + 1 + (j + 1) * (cellCountU + 1);
                polysUint32Arr[polygonIndex++] = i + (j + 1) * (cellCountU + 1);
            }
        }
    }
    const propertyArr = seismicCrosslineData.dataFloat32Arr;
    const transposedPropertyArr = [];
    for (let j = 0; j < depthSamples; j++) {
        for (let i = 0; i < cellCountU; i++) {
            transposedPropertyArr.push(propertyArr[i * depthSamples + j]);
        }
    }
    const chunkSize = 10000;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < transposedPropertyArr.length; i += chunkSize) {
        const chunk = transposedPropertyArr.slice(i, i + chunkSize);
        const chunkMin = Math.min(...chunk);
        const chunkMax = Math.max(...chunk);

        if (chunkMin < minValue) minValue = chunkMin;
        if (chunkMax > maxValue) maxValue = chunkMax;
    }
    return {
        pointsFloat32Arr,
        polysUint32Arr,
        propertyFloat32Arr: new Float32Array(transposedPropertyArr),
        minValue,
        maxValue,
    };
}
