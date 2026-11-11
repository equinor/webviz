import type { Color } from "@deck.gl/core";
import type { Point3D } from "@webviz/subsurface-viewer";
import type { LineString, Point } from "geojson";
import simplify from "simplify-js";

import type { WellboreTrajectory_api } from "@api";
import { point2Distance, vec2FromArray } from "@lib/utils/vec2";
import { distance, fromArray } from "@lib/utils/vec3";

import type { ExtendedWellFeature } from "./subsurfaceViewerLayers";

function normalizeVector(vector: number[]): number[] {
    const vectorLength = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
    return [vector[0] / vectorLength, vector[1] / vectorLength];
}

/**
 * Creates a simplified curve of (x,y) points using simplify-js.
 *
 * If the number of points is less than or equal to 2, it returns the original points without duplicates (if any).
 */
function createSimplifiedCurveFromXyPoints(xyPointsArray: { x: number; y: number }[], epsilon: number): number[][] {
    // Find simplified curve (simplify() has early return for number of points <= 2)
    if (xyPointsArray.length <= 2) {
        // Original points, without duplicate points if existing
        return xyPointsArray
            .map((point) => [point.x, point.y])
            .filter(
                (point, index, array) =>
                    index === 0 || point[0] !== array[index - 1][0] || point[1] !== array[index - 1][1],
            );
    }
    return simplify(xyPointsArray, epsilon).map((point) => [point.x, point.y]);
}

export type SimplifiedWellboreTrajectoryInXyPlaneResult = {
    simplifiedWellboreTrajectoryXy: number[][];
    actualSectionLengths: number[];
};

/*
    Calculates a simplified version of the wellbore trajectory in the XY plane by using the Ramer-Douglas-Peucker algorithm.
    Can also extend the trajectory by a specified length in the direction of the first and last non-zero vectors.
    If the wellbore is completely vertical, the trajectory will be extended in the x-direction.
*/
export function calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
    wellboreTrajectory: number[][],
    extensionLength: number = 0,
    epsilon: number = 0.1,
): SimplifiedWellboreTrajectoryInXyPlaneResult {
    const simplifiedTrajectoryXy: number[][] = [];
    const actualSectionLengths: number[] = [];

    const wellboreTrajectoryXyPoints = wellboreTrajectory.map((point) => ({ x: point[0], y: point[1] }));

    // Get simplified curve from xy trajectory
    const simplifiedCurveXy = createSimplifiedCurveFromXyPoints(wellboreTrajectoryXyPoints, epsilon);

    let lastWellboreTrajectoryIndex = 0;
    for (const [index, point] of simplifiedCurveXy.entries()) {
        simplifiedTrajectoryXy.push([point[0], point[1]]);

        if (index === 0) {
            continue;
        }

        let sectionLength = 0;
        for (let i = lastWellboreTrajectoryIndex + 1; i < wellboreTrajectory.length; i++) {
            sectionLength += point2Distance(
                vec2FromArray(wellboreTrajectory[i]),
                vec2FromArray(wellboreTrajectory[i - 1]),
            );

            if (wellboreTrajectory[i][0] === point[0] && wellboreTrajectory[i][1] === point[1]) {
                actualSectionLengths.push(sectionLength);
                lastWellboreTrajectoryIndex = i;
                break;
            }
        }
    }

    if (extensionLength > 0) {
        const vectorEndPoint = simplifiedCurveXy[simplifiedCurveXy.length - 1];
        let vectorStartPoint = vectorEndPoint;
        for (let i = simplifiedCurveXy.length - 2; i >= 0; i--) {
            if (simplifiedCurveXy[i][0] !== vectorEndPoint[0] || simplifiedCurveXy[i][1] !== vectorEndPoint[1]) {
                vectorStartPoint = simplifiedCurveXy[i];
                break;
            }
        }

        const vector = [vectorEndPoint[0] - vectorStartPoint[0], vectorEndPoint[1] - vectorStartPoint[1]];

        if (vector[0] === 0 && vector[1] === 0) {
            vector[0] = 1;
        }

        const normalizedVector = normalizeVector(vector);

        const extendedFirstPoint = [
            simplifiedCurveXy[0][0] - normalizedVector[0] * extensionLength,
            simplifiedCurveXy[0][1] - normalizedVector[1] * extensionLength,
        ];
        const extendedLastPoint = [
            simplifiedCurveXy[simplifiedCurveXy.length - 1][0] + normalizedVector[0] * extensionLength,
            simplifiedCurveXy[simplifiedCurveXy.length - 1][1] + normalizedVector[1] * extensionLength,
        ];

        simplifiedTrajectoryXy.unshift(extendedFirstPoint);
        simplifiedTrajectoryXy.push(extendedLastPoint);

        actualSectionLengths.unshift(
            point2Distance(vec2FromArray(extendedFirstPoint), vec2FromArray(simplifiedCurveXy[0])),
        );
        actualSectionLengths.push(
            point2Distance(
                vec2FromArray(extendedLastPoint),
                vec2FromArray(simplifiedCurveXy[simplifiedCurveXy.length - 1]),
            ),
        );
    }

    return {
        simplifiedWellboreTrajectoryXy: simplifiedTrajectoryXy,
        actualSectionLengths,
    };
}

export function zipTrajectoryCoord(
    wellboreTrajectory: MinimalWellboreTrajectory,
    index: number,
    invertZAxis?: boolean,
): Point3D {
    if (index < 0 || index >= wellboreTrajectory.eastingArr.length) {
        throw new Error(`Segment index ${index} is out of bounds.`);
    }

    const zSign = invertZAxis ? -1 : 1;

    return [
        wellboreTrajectory.eastingArr[index],
        wellboreTrajectory.northingArr[index],
        wellboreTrajectory.tvdMslArr[index] * zSign,
    ];
}

export function zipTrajectoryCoords(wellboreTrajectory: MinimalWellboreTrajectory, invertZAxis?: boolean): Point3D[] {
    const coords: Point3D[] = [];

    for (let i = 0; i < wellboreTrajectory.eastingArr.length; i++) {
        coords.push(zipTrajectoryCoord(wellboreTrajectory, i, invertZAxis));
    }

    return coords;
}

export function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    opts?: {
        /** Inverts z-axis values (aka, TVD values).
         * @default false
         */
        invertZAxis?: boolean;
        /** Highlights a specified wellbore */
        selectedWellboreUuid?: string;
    },
): ExtendedWellFeature {
    const trajectoryLineString: LineString = {
        type: "LineString",
        coordinates: zipTrajectoryCoords(wellTrajectory, opts?.invertZAxis),
    };

    const wellHeadPoint: Point = {
        type: "Point",
        coordinates: [...trajectoryLineString.coordinates[0]],
    };

    let color = [150, 150, 150] as Color;
    let lineWidth = 3;
    let wellHeadSize = 1;

    if (wellTrajectory.wellboreUuid === opts?.selectedWellboreUuid) {
        color = [255, 0, 0];
        lineWidth = 5;
        wellHeadSize = 10;
    }

    const geometryCollection: ExtendedWellFeature = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [wellHeadPoint, trajectoryLineString],
        },
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            uwi: wellTrajectory.uniqueWellboreIdentifier,
            lineWidth,
            wellHeadSize,
            name: wellTrajectory.uniqueWellboreIdentifier,
            color,
            md: [wellTrajectory.mdArr],
        },
    };

    return geometryCollection;
}

/**
 * Calculates the fractional length along a segment of a wellbore trajectory for a given measured depth (MD).
 * @param wellboreTrajectory The wellbore trajectory to interpolate within.
 * @param segmentStart The index of the start point of the segment.
 * @param segmentEnd The index of the end point of the segment.
 * @param md A measured depth value.
 * @returns the fractional [0-1] length along whatever segment the MD is between.
 */
export function getLengthAlongSegment(
    wellboreTrajectory: MinimalWellboreTrajectory,
    segmentStart: number,
    segmentEnd: number,
    md: number,
): number {
    const mdStart = wellboreTrajectory.mdArr[segmentStart];
    const mdEnd = wellboreTrajectory.mdArr[segmentEnd];

    if (mdStart === mdEnd) {
        console.warn(`MD values for segment start and end are equal (${mdStart}). Returning 0.`);
        return 0;
    }
    if (md < mdStart) {
        console.warn(`MD value ${md} is outside the range of the segment [${mdStart}, ${mdEnd}]. Returning 0.`);
        return 0;
    }

    if (md > mdEnd) {
        console.warn(`MD value ${md} is outside the range of the segment [${mdStart}, ${mdEnd}]. Returning 1.`);
        return 1;
    }

    return (md - mdStart) / (mdEnd - mdStart);
}

/**
 * Interpolates the 3D position at a given position along a trajectory segment.
 * @param wellboreTrajectory The wellbore trajectory to interpolate within.
 * @param segmentStart The index of the start point of the segment.
 * @param segmentEnd The index of the end point of the segment.
 * @param lengthAlongSegment A value in [0, 1] representing how far along the segment to interpolate.
 * @returns the interpolated UTM world position as a 3d-point array. Z increases upwards
 */
export function interpolateSegmentPosition(
    wellboreTrajectory: MinimalWellboreTrajectory,
    segmentStart: number,
    segmentEnd: number,
    lengthAlongSegment: number,
): Point3D {
    const startPoint = zipTrajectoryCoord(wellboreTrajectory, segmentStart, true);
    const endPoint = zipTrajectoryCoord(wellboreTrajectory, segmentEnd, true);

    return [
        startPoint[0] + lengthAlongSegment * (endPoint[0] - startPoint[0]),
        startPoint[1] + lengthAlongSegment * (endPoint[1] - startPoint[1]),
        startPoint[2] + lengthAlongSegment * (endPoint[2] - startPoint[2]),
    ];
}

export type MinimalWellboreTrajectory = Pick<
    WellboreTrajectory_api,
    "eastingArr" | "mdArr" | "northingArr" | "tvdMslArr"
>;

type TrajectoryPoint = { easting: number; northing: number; tvdMsl: number };

export function trajectoryDistanceRadial(point1: TrajectoryPoint, point2: TrajectoryPoint) {
    const vec1 = fromArray([point1.easting, point1.northing, point1.tvdMsl]);
    const vec2 = fromArray([point2.easting, point2.northing, point2.tvdMsl]);

    return distance(vec1, vec2);
}

export function trajectoryDistanceXY(point1: TrajectoryPoint, point2: TrajectoryPoint) {
    return point2Distance(
        vec2FromArray([point1.easting, point1.northing]),
        vec2FromArray([point2.easting, point2.northing]),
    );
}

/**
 * Simplifies a wellbore trajectory by removing points that are closer than a specified distance threshold.
 * @param trajectory A wellbore trajectory.
 * @param threshold The distance threshold for the simplification.
 * @param computeDistance A function to compute the distance between two points. Defaults to `trajectoryDistanceRadial`.
 * @returns A simplified wellbore trajectory.
 */
export function simplifyWellTrajectory<TTrajectory extends MinimalWellboreTrajectory>(
    trajectory: TTrajectory,
    threshold: number,
    computeDistance = trajectoryDistanceRadial,
): TTrajectory {
    let prevPoint: TrajectoryPoint | null = null;

    const simplifiedTrajectory: TTrajectory = {
        ...trajectory,
        eastingArr: [],
        northingArr: [],
        tvdMslArr: [],
        mdArr: [],
    };

    for (let index = 0; index < trajectory.eastingArr.length; index++) {
        const point = {
            easting: trajectory.eastingArr[index],
            northing: trajectory.northingArr[index],
            tvdMsl: trajectory.tvdMslArr[index],
            md: trajectory.mdArr[index],
        };

        if (
            // Always include the first and last points
            !prevPoint ||
            index === trajectory.eastingArr.length - 1 ||
            computeDistance(point, prevPoint) > threshold
        ) {
            simplifiedTrajectory.eastingArr.push(point.easting);
            simplifiedTrajectory.northingArr.push(point.northing);
            simplifiedTrajectory.tvdMslArr.push(point.tvdMsl);
            simplifiedTrajectory.mdArr.push(point.md);

            prevPoint = point;
        }
    }
    return simplifiedTrajectory;
}

/**
 * Checks if a measured depth (MD) value is within the range of a wellbore trajectory's measured depth array.
 * @param trajectory A wellbore trajectory object
 * @param md A measured depth value
 * @returns `true` if the measured depth is within the range of the trajectory's measured depth array, otherwise `false`.
 */
export function isInMdRange(trajectory: MinimalWellboreTrajectory, md: number): boolean {
    const minMd = trajectory.mdArr[0];
    const maxMd = trajectory.mdArr[trajectory.mdArr.length - 1];

    return md >= minMd && md <= maxMd;
}
