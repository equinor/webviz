import type { Color } from "@deck.gl/core";
import type { Point3D } from "@webviz/subsurface-viewer";
import type { LineString, Point } from "geojson";
import { clamp, sortedIndex } from "lodash";
import simplify from "simplify-js";

import type { WellboreTrajectory_api } from "@api";
import { point2Distance, vec2FromArray } from "@lib/utils/vec2";
import { distance, fromArray } from "@lib/utils/vec3";

import type { GeoWellFeature } from "../DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";

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

export function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[], invertZAxis?: boolean): number[][] {
    if (x_arr.length !== y_arr.length || y_arr.length !== z_arr.length)
        throw Error(`Expected each coordinate array to be of equal length.`);

    const zSign = invertZAxis ? -1 : 1;

    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], zSign * z_arr[i]]);
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
): GeoWellFeature {
    const trajectoryLineString: LineString = {
        type: "LineString",
        coordinates: zipCoords(
            wellTrajectory.eastingArr,
            wellTrajectory.northingArr,
            wellTrajectory.tvdMslArr,
            opts?.invertZAxis,
        ),
    };

    const wellHeadPoint: Point = {
        type: "Point",
        coordinates: [...trajectoryLineString.coordinates[0]],
    };

    let color = [150, 150, 150] as Color;
    let lineWidth = 2;
    let wellHeadSize = 1;

    if (wellTrajectory.wellboreUuid === opts?.selectedWellboreUuid) {
        color = [255, 0, 0];
        lineWidth = 5;
        wellHeadSize = 10;
    }

    const geometryCollection: GeoWellFeature = {
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
 * Gets the trajectory array index for a given MD so that `mdArr[i-1] <= md <= mdArr[i]`.
 * @throws if the trajectory has no points.
 * @param md Measured Depth to find the trajectory index for.
 * @param wellboreTrajectory The wellbore trajectory to search within.
 * @returns an index in the range [1, mdArr.length - 1]
 */
export function getTrajectoryIndexForMd(md: number, wellboreTrajectory: WellboreTrajectory_api) {
    const { mdArr } = wellboreTrajectory;

    if (!mdArr.length) throw Error(`Expected trajectory to be at least one point, got 0 points`);

    // Ensure we only deal with valid MD values
    md = clamp(md, 0, mdArr.at(-1)!);

    // The mdArr is sorted, so we do a binary search to find the relevant trajectory indices
    const index = sortedIndex(mdArr, md);

    // sortedIndex will return 0 if md is exactly the same as the first element, but we want to avoid index-1 being undefined
    return Math.max(index, 1);
}

/**
 * Interpolates the 3D position at a given MD value along the wellbore trajectory.
 * @param md Measured Depth to interpolate the position for.
 * @param wellboreTrajectory The wellbore trajectory to interpolate within.
 * @param preComputedTrajectoryIndex (optional) If provided, this index will be used for interpolation instead of calculating it again.
 * @returns the interpolated UTM world position as a 3d-point array
 */
export function getInterpolatedPositionAtMd(
    md: number,
    wellboreTrajectory: WellboreTrajectory_api,
    preComputedTrajectoryIndex?: number,
): Point3D {
    const { mdArr, eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;
    const trajectoryIndex = preComputedTrajectoryIndex ?? getTrajectoryIndexForMd(md, wellboreTrajectory);

    // Get the real life points before and after the point
    const nextMd = mdArr[trajectoryIndex];
    const nextX = eastingArr[trajectoryIndex];
    const nextY = northingArr[trajectoryIndex];
    const nextZ = tvdMslArr[trajectoryIndex];

    const prevMd = mdArr[trajectoryIndex - 1];
    const prevX = eastingArr[trajectoryIndex - 1];
    const prevY = northingArr[trajectoryIndex - 1];
    const prevZ = tvdMslArr[trajectoryIndex - 1];

    // Calculate how far along this segment the mdPoint is
    const ratio = (md - prevMd) / (nextMd - prevMd);

    const dx = nextX - prevX;
    const dy = nextY - prevY;
    const dz = nextZ - prevZ;

    return [prevX + ratio * dx, prevY + ratio * dy, prevZ + ratio * dz];
}

/**
 * Interpolates the normal vector at a given MD value along the wellbore trajectory.
 * @param md Measured Depth to interpolate the normal for.
 * @param wellboreTrajectory The wellbore trajectory to interpolate within.
 * @param preComputedTrajectoryIndex (optional) If provided, this index will be used for interpolation instead of calculating it again.
 * @returns A normalized vector representing the direction of the wellbore at the given MD.
 */
export function getInterpolatedNormalAtMd(
    md: number,
    wellboreTrajectory: WellboreTrajectory_api,
    preComputedTrajectoryIndex?: number,
): [number, number, number] {
    const { eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;
    const trajectoryIndex = preComputedTrajectoryIndex ?? getTrajectoryIndexForMd(md, wellboreTrajectory);

    const nextX = eastingArr[trajectoryIndex];
    const nextY = northingArr[trajectoryIndex];
    const nextZ = tvdMslArr[trajectoryIndex];

    const prevX = eastingArr[trajectoryIndex - 1];
    const prevY = northingArr[trajectoryIndex - 1];
    const prevZ = tvdMslArr[trajectoryIndex - 1];

    const dx = nextX - prevX;
    const dy = nextY - prevY;
    const dz = nextZ - prevZ;

    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return length === 0 ? [0, 0, 1] : [dx / length, dy / length, -dz / length];
}

export type MinimalWellboreTrajectory = Pick<
    WellboreTrajectory_api,
    "eastingArr" | "mdArr" | "northingArr" | "tvdMslArr"
>;

type TrajectoryPoint = { easting: number; northing: number; tvdMsl: number };

function defaultRadialDistance(point1: TrajectoryPoint, point2: TrajectoryPoint) {
    const vec1 = fromArray([point1.easting, point1.northing, point1.tvdMsl]);
    const vec2 = fromArray([point2.easting, point2.northing, point2.tvdMsl]);

    return distance(vec1, vec2);
}

export function simplifyWellTrajectoryRadialDist<TTrajectory extends MinimalWellboreTrajectory>(
    trajectory: TTrajectory,
    threshold: number,
    computeDistance = defaultRadialDistance,
): TTrajectory {
    const thresholdSquared = threshold * threshold;

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
            computeDistance(point, prevPoint) > thresholdSquared
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
