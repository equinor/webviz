import { SurfaceStatisticalFanchart } from "../layers/SurfaceStatisticalFanchartCanvasLayer";

export type StratigraphyColorMap = { [name: string]: string };

function calcMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcPercentile(values: number[], percentile: number): number {
    values.sort((a, b) => a - b);
    const index = ((values.length - 1) * percentile) / 100;
    const base = Math.floor(index);
    const rest = index - base;
    if (values[base + 1] !== undefined) {
        return values[base] + rest * (values[base + 1] - values[base]);
    } else {
        return values[base];
    }
}

function mergeXAndYArrays(arrayX: number[], arrayY: number[]): number[][] {
    return arrayX.map((x, i) => [x, arrayY[i]]);
}

export function makeSurfaceStatisticalFanchartFromRealizationSurface(
    realizationSamplePoints: number[][],
    cumulatedLength: number[],
    surfaceName: string,
    color: string,
    visibility?: {
        mean: boolean;
        minMax: boolean;
        p10p90: boolean;
        p50: boolean;
    }
): SurfaceStatisticalFanchart {
    const numPoints = realizationSamplePoints[0]?.length || 0;

    const mean = new Array(numPoints).fill(undefined);
    const min = new Array(numPoints).fill(Infinity);
    const max = new Array(numPoints).fill(-Infinity);
    const p10 = new Array(numPoints).fill(undefined);
    const p50 = new Array(numPoints).fill(undefined);
    const p90 = new Array(numPoints).fill(undefined);

    for (let i = 0; i < numPoints; i++) {
        const values = realizationSamplePoints.map((el) => el[i]);
        if (values.some((value) => value === null)) {
            continue;
        }
        mean[i] = calcMean(values);
        min[i] = Math.min(...values);
        max[i] = Math.max(...values);
        p10[i] = calcPercentile(values, 10);
        p50[i] = calcPercentile(values, 50);
        p90[i] = calcPercentile(values, 90);
    }

    return {
        color,
        label: surfaceName,
        data: {
            mean: mergeXAndYArrays(cumulatedLength, mean),
            min: mergeXAndYArrays(cumulatedLength, min),
            max: mergeXAndYArrays(cumulatedLength, max),
            p10: mergeXAndYArrays(cumulatedLength, p10),
            p50: mergeXAndYArrays(cumulatedLength, p50),
            p90: mergeXAndYArrays(cumulatedLength, p90),
        },
        visibility,
    };
}
