import { describe, expect, test } from "vitest";

import type { MinimalWellboreTrajectory } from "../../src/modules/_shared/utils/wellbore";
import {
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    zipCoords,
    wellTrajectoryToGeojson,
    getTrajectoryIndexForMd,
    interpolateSegmentPosition,
    getInterpolatedNormalAtMd,
    simplifyWellTrajectory,
    isInMdRange,
    trajectoryDistanceRadial,
    trajectoryDistanceXY,
} from "../../src/modules/_shared/utils/wellbore";

describe("calcExtendedSimplifiedWellboreTrajectoryInXYPlane", () => {
    test("should calculate a simplified trajectory and extend it", () => {
        const trajectory = [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
        ];
        const result = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectory, 1, 0.1);
        expect(result.simplifiedWellboreTrajectoryXy.length).toBeGreaterThan(0);
        expect(result.actualSectionLengths.length).toBeGreaterThan(0);
    });

    test("should handle a trajectory of length 2", () => {
        const trajectory = [
            [0, 0],
            [1, 1],
        ];
        const result = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectory, 1, 0.1);
        expect(result.simplifiedWellboreTrajectoryXy.length).toBeGreaterThan(0);
        expect(result.actualSectionLengths.length).toBeGreaterThan(0);
    });
});

describe("zipCoords", () => {
    test("should zip coordinates correctly", () => {
        const x = [1, 2, 3];
        const y = [4, 5, 6];
        const z = [7, 8, 9];
        const result = zipCoords(x, y, z);
        expect(result).toEqual([
            [1, 4, 7],
            [2, 5, 8],
            [3, 6, 9],
        ]);
    });

    test("should invert Z-axis if specified", () => {
        const x = [1, 2, 3];
        const y = [4, 5, 6];
        const z = [7, 8, 9];
        const result = zipCoords(x, y, z, true);
        expect(result).toEqual([
            [1, 4, -7],
            [2, 5, -8],
            [3, 6, -9],
        ]);
    });
});

describe("wellTrajectoryToGeojson", () => {
    test("should convert well trajectory to GeoJSON", () => {
        const trajectory = {
            eastingArr: [1, 2],
            northingArr: [3, 4],
            tvdMslArr: [5, 6],
            wellboreUuid: "uuid",
            uniqueWellboreIdentifier: "uwi",
            mdArr: [0, 1],
        };
        const result = wellTrajectoryToGeojson(trajectory);
        expect(result.geometry.type).toBe("GeometryCollection");
    });
});

describe("getTrajectoryIndexForMd", () => {
    test("should return the correct trajectory index for a given MD", () => {
        const trajectory = { mdArr: [0, 10, 20, 30] } as MinimalWellboreTrajectory;
        const index = getTrajectoryIndexForMd(15, trajectory);
        expect(index).toBe(2);
    });
});

describe("interpolateSegmentPosition", () => {
    test("should interpolate the position along a trajectory segment", () => {
        const trajectory = {
            eastingArr: [0, 10],
            northingArr: [0, 10],
            tvdMslArr: [0, 10],
        } as MinimalWellboreTrajectory;
        const result = interpolateSegmentPosition(trajectory, 0, 1, 0.5);
        expect(result).toEqual([5, 5, -5]);
    });
});

describe("getInterpolatedNormalAtMd", () => {
    test("should return the interpolated normal vector at a given MD", () => {
        const trajectory = {
            eastingArr: [0, 10],
            northingArr: [0, 10],
            tvdMslArr: [0, 10],
            mdArr: [0, 10],
        };
        const normal = getInterpolatedNormalAtMd(5, trajectory);
        expect(normal).toEqual([Math.sqrt(1 / 3), Math.sqrt(1 / 3), -Math.sqrt(1 / 3)]);
    });
});

describe("simplifyWellTrajectory", () => {
    test("should simplify the well trajectory based on the threshold", () => {
        const trajectory = {
            eastingArr: [0, 1, 10, 11],
            northingArr: [0, 1, 10, 11],
            tvdMslArr: [0, 1, 10, 11],
            mdArr: [0, 1, 10, 11],
        };
        const result = simplifyWellTrajectory(trajectory, 3);
        expect(result.eastingArr.length).toBeLessThan(trajectory.eastingArr.length);
    });
});

describe("isInMdRange", () => {
    test("should return true if MD is within range", () => {
        const trajectory = { mdArr: [0, 10, 20] } as MinimalWellboreTrajectory;
        expect(isInMdRange(trajectory, 15)).toBe(true);
    });

    test("should return false if MD is out of range", () => {
        const trajectory = { mdArr: [0, 10, 20] } as MinimalWellboreTrajectory;
        expect(isInMdRange(trajectory, 25)).toBe(false);
    });
});

describe("trajectoryDistanceRadial", () => {
    test("should calculate the radial distance between two points", () => {
        const point1 = { easting: 0, northing: 0, tvdMsl: 0 };
        const point2 = { easting: 3, northing: 4, tvdMsl: 0 };
        expect(trajectoryDistanceRadial(point1, point2)).toBe(5);
    });
});

describe("trajectoryDistanceXY", () => {
    test("should calculate the XY distance between two points, ignoring TVD", () => {
        const point1 = { easting: 0, northing: 0, tvdMsl: 0 };
        const point2 = { easting: 3, northing: 4, tvdMsl: 100 };
        expect(trajectoryDistanceXY(point1, point2)).toBe(5);
    });
});
