import type { ECharts } from "echarts";

import type { InteractionSeries, InteractionSeriesEntry } from "./types";

export type ResolvedTarget = {
    entry: InteractionSeriesEntry;
    dataIndex: number;
    matchingSeriesIndices: number[];
};

const POINT_ANNOTATION_HOVER_RADIUS_PX = 10;
const POINT_ANNOTATION_HOVER_RADIUS_SQ = POINT_ANNOTATION_HOVER_RADIUS_PX * POINT_ANNOTATION_HOVER_RADIUS_PX;

/**
 * Hit-tests all subplot grids to find the interaction entry closest to the
 * cursor position. For timeseries resolution mode, uses Y-distance at the
 * nearest category index (with priority for point annotations within a
 * pixel radius). For scatter mode, uses Euclidean pixel distance.
 */
export function resolveClosestSeriesEntry(
    instance: ECharts,
    interactionIndex: InteractionSeries,
    pixelX: number,
    pixelY: number,
): ResolvedTarget | null {
    for (const [axisIndex, series] of interactionIndex.seriesByAxisIndex.entries()) {
        if (!instance.containPixel({ gridIndex: axisIndex }, [pixelX, pixelY])) {
            continue;
        }

        const dataPoint = instance.convertFromPixel({ gridIndex: axisIndex }, [pixelX, pixelY]);
        if (!Array.isArray(dataPoint) || dataPoint.length < 2) {
            continue;
        }

        if (interactionIndex.resolutionMode === "timeseries") {
            const categoryIndex = Math.round(Number(dataPoint[0]));
            const cursorValue = Number(dataPoint[1]);
            if (!Number.isFinite(categoryIndex) || !Number.isFinite(cursorValue)) {
                continue;
            }
            if (series.length === 0 || categoryIndex < 0 || categoryIndex >= series[0].values.length) {
                continue;
            }

            const closestPointAnnotation = findClosestPointAnnotationEntry(
                instance, series, axisIndex, categoryIndex, pixelX, pixelY,
            );
            if (closestPointAnnotation) {
                return {
                    entry: closestPointAnnotation,
                    dataIndex: categoryIndex,
                    matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closestPointAnnotation.interactionKey),
                };
            }

            const closest = findClosestSeriesEntryByValue(series, categoryIndex, cursorValue);
            if (!closest) continue;

            return {
                entry: closest,
                dataIndex: categoryIndex,
                matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closest.interactionKey),
            };
        }

        const closest = findClosestScatterEntry(instance, series, axisIndex, pixelX, pixelY);
        if (!closest) continue;

        return {
            entry: closest,
            dataIndex: 0,
            matchingSeriesIndices: getMatchingSeriesIndices(interactionIndex, closest.interactionKey),
        };
    }

    return null;
}

/** Finds the series entry whose value is closest to cursorValue at the given category index. */
export function findClosestSeriesEntryByValue(
    series: InteractionSeriesEntry[],
    categoryIndex: number,
    cursorValue: number,
): InteractionSeriesEntry | null {
    let closest: InteractionSeriesEntry | null = null;
    let minDistance = Infinity;

    for (const candidate of series) {
        const value = candidate.values[categoryIndex];
        if (!Number.isFinite(value)) continue;

        const distance = Math.abs(value - cursorValue);
        if (distance < minDistance) {
            minDistance = distance;
            closest = candidate;
        }
    }

    return closest;
}

function findClosestPointAnnotationEntry(
    instance: ECharts,
    series: InteractionSeriesEntry[],
    axisIndex: number,
    categoryIndex: number,
    pixelX: number,
    pixelY: number,
): InteractionSeriesEntry | null {
    let closest: InteractionSeriesEntry | null = null;
    let minDistSq = Infinity;

    for (const candidate of series) {
        if (candidate.kind !== "point-annotation") continue;

        const value = candidate.values[categoryIndex];
        if (!Number.isFinite(value)) continue;

        const pointPixel = instance.convertToPixel({ gridIndex: axisIndex }, [categoryIndex, value]);
        if (!Array.isArray(pointPixel)) continue;

        const dx = pointPixel[0] - pixelX;
        const dy = pointPixel[1] - pixelY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= POINT_ANNOTATION_HOVER_RADIUS_SQ && distSq < minDistSq) {
            minDistSq = distSq;
            closest = candidate;
        }
    }

    return closest;
}

function findClosestScatterEntry(
    instance: ECharts,
    series: InteractionSeriesEntry[],
    gridIndex: number,
    pixelX: number,
    pixelY: number,
): InteractionSeriesEntry | null {
    let closest: InteractionSeriesEntry | null = null;
    let minDistSq = Infinity;

    for (const candidate of series) {
        if (candidate.xValues.length === 0 || candidate.values.length === 0) continue;

        const pointPixel = instance.convertToPixel({ gridIndex }, [candidate.xValues[0], candidate.values[0]]);
        if (!Array.isArray(pointPixel)) continue;

        const dx = pointPixel[0] - pixelX;
        const dy = pointPixel[1] - pixelY;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
            minDistSq = distSq;
            closest = candidate;
        }
    }

    return closest;
}

function getMatchingSeriesIndices(
    interactionIndex: InteractionSeries,
    interactionKey: string,
): number[] {
    return interactionIndex.matchingSeriesIndicesByKey.get(interactionKey) ?? [];
}
