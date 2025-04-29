import type { QueryClient } from "@tanstack/query-core";

import { getWellTrajectoriesOptions } from "@api";
import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import type { Vec2 } from "@lib/utils/vec2";
import { normalizeVec2, point2Distance, vec2FromArray } from "@lib/utils/vec2";

import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "../utils/wellbore";

import type { PolylineWithSectionLengths } from "./intersectionPolylineTypes";

export const CURVE_FITTING_EPSILON = 5; // meter

export type PolylineIntersectionSpecification = {
    type: IntersectionType.CUSTOM_POLYLINE;
    polyline: IntersectionPolyline;
};

export type WellboreIntersectionSpecification = {
    type: IntersectionType.WELLBORE;
    wellboreUuid: string;
    intersectionExtensionLength: number;
    fieldIdentifier: string;
    queryClient: QueryClient;
};

export type IntersectionSpecification = PolylineIntersectionSpecification | WellboreIntersectionSpecification;

/**
 * Make promise with polyline XY UTM coordinates and actual section lengths for requested intersection specification.
 *
 * Returns promise with array of polyline XY UTM coordinates and actual section lengths.
 *
 * Actual section lengths are the actual lengths of the polyline sections for polyline which can be
 * down sampled or simplified.
 */
export function makeIntersectionPolylineWithSectionLengthsPromise(
    intersectionSpecification: IntersectionSpecification,
): Promise<PolylineWithSectionLengths> {
    // Polyline intersection
    if (intersectionSpecification.type === IntersectionType.CUSTOM_POLYLINE) {
        const { polyline } = intersectionSpecification;
        const polylineUtmXy: number[] = [];
        const actualSectionLengths: number[] = [];
        for (const [index, point] of polyline.path.entries()) {
            polylineUtmXy.push(point[0], point[1]);
            if (index > 0) {
                const previousPoint = polyline.path[index - 1];
                actualSectionLengths.push(point2Distance(vec2FromArray(point), vec2FromArray(previousPoint)));
            }
        }

        return Promise.resolve({ polylineUtmXy, actualSectionLengths });
    }

    // Wellbore intersection
    const { intersectionExtensionLength, wellboreUuid, fieldIdentifier, queryClient } = intersectionSpecification;
    const makePolylineAndActualSectionLengthsPromise = queryClient
        .fetchQuery({
            ...getWellTrajectoriesOptions({
                query: {
                    field_identifier: fieldIdentifier ?? "",
                    wellbore_uuids: [wellboreUuid],
                },
            }),
        })
        .then((wellTrajectoryData) => {
            const wellTrajectoryPath: number[][] = [];
            for (const [index, northing] of wellTrajectoryData[0].northingArr.entries()) {
                const easting = wellTrajectoryData[0].eastingArr[index];
                const tvd_msl = wellTrajectoryData[0].tvdMslArr[index];

                wellTrajectoryPath.push([easting, northing, tvd_msl]);
            }

            const simplifiedWellboreTrajectory = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                wellTrajectoryPath,
                intersectionExtensionLength,
                CURVE_FITTING_EPSILON,
            );

            const polylineUtmXy = simplifiedWellboreTrajectory.simplifiedWellboreTrajectoryXy.flat();
            const actualSectionLengths = simplifiedWellboreTrajectory.actualSectionLengths;
            return { polylineUtmXy, actualSectionLengths };
        });

    return makePolylineAndActualSectionLengthsPromise;
}

/**
 * Create resampled polyline XY UTM coordinates.
 *
 * Takes a polyline xy utm coordinates and a sample step and returns a resampled polyline xy utm coordinates,
 * where the sample step is the distance between each point in the resampled polyline.
 */
export function createResampledPolylineXyUtm(polylineXyUtm: number[], sampleStep: number): number[] {
    const resampledPolyline: number[] = [];
    const limitedSampleStep = Math.max(1, sampleStep);

    for (let i = 0; i < polylineXyUtm.length; i += 2) {
        if (i > 0) {
            const distance = point2Distance(
                { x: polylineXyUtm[i], y: polylineXyUtm[i + 1] },
                { x: polylineXyUtm[i - 2], y: polylineXyUtm[i - 1] },
            );
            const vector: Vec2 = {
                x: polylineXyUtm[i] - polylineXyUtm[i - 2],
                y: polylineXyUtm[i + 1] - polylineXyUtm[i - 1],
            };
            const normalizedVector = normalizeVec2(vector);

            const numResamplePoints = Math.floor(distance / limitedSampleStep) - 1;
            for (let p = 1; p <= numResamplePoints; p++) {
                resampledPolyline.push(polylineXyUtm[i - 2] + normalizedVector.x * limitedSampleStep * p);
                resampledPolyline.push(polylineXyUtm[i - 1] + normalizedVector.y * limitedSampleStep * p);
            }
        }

        // Add the last point of the segment
        resampledPolyline.push(polylineXyUtm[i]);
        resampledPolyline.push(polylineXyUtm[i + 1]);
    }

    return resampledPolyline;
}

/**
 * Resample polyline XY UTM coordinates with section lengths.
 *
 * Takes a polyline xy utm coordinates with section lengths and a sample step and returns a resampled polyline xy utm coordinates
 * with corresponding resampled section lengths.
 *
 * The resampling is performed per section of the input polyline, meaning that the resampling is done for each segment of the polyline.
 * With sample step as the distance between each point in the resampled polyline segment. This is to ensure that the original polyline
 * points are not lost during the resampling process.
 *
 * Note: If a section length is less than the sample step, it will not be resampled.
 */
export function createSectionWiseResampledPolylineWithSectionLengths(
    polylineWithSectionLengths: PolylineWithSectionLengths,
    sampleStep: number,
): PolylineWithSectionLengths {
    const { polylineUtmXy, actualSectionLengths } = polylineWithSectionLengths;

    const numPoints = polylineUtmXy.length / 2;
    if (actualSectionLengths.length !== numPoints - 1) {
        throw new Error("The number of points in the polyline does not match the number of actual section lengths");
    }
    if (numPoints < 1) {
        throw new Error("There are no points in the polyline");
    }

    const resampledPolyline: number[] = [];
    const resampledSectionLengths: number[] = [];
    const limitedSampleStep = Math.max(1, sampleStep);

    // Add first point
    resampledPolyline.push(polylineUtmXy[0]);
    resampledPolyline.push(polylineUtmXy[1]);

    for (let i = 2; i < polylineUtmXy.length; i += 2) {
        const distance = point2Distance(
            { x: polylineUtmXy[i], y: polylineUtmXy[i + 1] },
            { x: polylineUtmXy[i - 2], y: polylineUtmXy[i - 1] },
        );
        const vector: Vec2 = {
            x: polylineUtmXy[i] - polylineUtmXy[i - 2],
            y: polylineUtmXy[i + 1] - polylineUtmXy[i - 1],
        };
        const normalizedVector = normalizeVec2(vector);

        // Find number of resample points
        const numResampledPoints = Math.floor(distance / limitedSampleStep);

        // Note: < numResampledPoints, because last point is the original point and should not be calculated
        for (let p = 1; p < numResampledPoints; p++) {
            resampledPolyline.push(polylineUtmXy[i - 2] + normalizedVector.x * limitedSampleStep * p);
            resampledPolyline.push(polylineUtmXy[i - 1] + normalizedVector.y * limitedSampleStep * p);
        }

        // Actual section length for the segment
        const actualSectionLength = actualSectionLengths[i / 2 - 1];

        // Resample section length if there are resampled points
        let resampledSectionLengthsForSegment: number[] = [actualSectionLength];
        if (numResampledPoints > 1.0) {
            const resampledSectionLength = actualSectionLength / numResampledPoints;
            resampledSectionLengthsForSegment = [];

            // Resampled section lengths up until last resample point
            for (let p = 1; p < numResampledPoints; p++) {
                resampledSectionLengthsForSegment.push(resampledSectionLength);
            }

            // Add section length between last resampled point and original point
            resampledSectionLengthsForSegment.push(
                actualSectionLength - resampledSectionLength * (numResampledPoints - 1),
            );
        }

        // Add the original (last) point of the segment
        resampledPolyline.push(polylineUtmXy[i]);
        resampledPolyline.push(polylineUtmXy[i + 1]);

        // Add resampled section lengths for segment
        resampledSectionLengths.push(...resampledSectionLengthsForSegment);
    }

    if (resampledSectionLengths.length !== resampledPolyline.length / 2 - 1) {
        throw new Error(
            "The number of points in the resampled polyline does not match the number of resampled section lengths",
        );
    }

    return { polylineUtmXy: resampledPolyline, actualSectionLengths: resampledSectionLengths };
}
