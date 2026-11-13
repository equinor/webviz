import { describe, expect, test } from "vitest";

import type { MinimalWellboreTrajectory } from "../../src/modules/_shared/utils/wellbore";
import {
    calcExtendedSimplifiedWellboreTrajectoryInXYPlane,
    zipTrajectoryCoord,
    zipTrajectoryCoords,
    wellTrajectoryToGeojson,
    interpolateSegmentPosition,
    simplifyWellTrajectory,
    isInMdRange,
    trajectoryDistanceRadial,
    trajectoryDistanceXY,
    getLengthAlongSegment,
} from "../../src/modules/_shared/utils/wellbore";

describe("calcExtendedSimplifiedWellboreTrajectoryInXYPlane", () => {
    test("should calculate a simplified trajectory and extend it", () => {
        const trajectory = [
            [0, 0, 0],
            [0, 0, 2],
            [4, 3, 3],
            [5, 4, 4],
            [6, 5, 4],
            [6, 7, 5],
        ];
        const result = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectory);

        expect(result.simplifiedWellboreTrajectoryXy).toEqual([
            [0, 0],
            [4, 3],
            [6, 5],
            [6, 7],
        ]);
    });

    test("should return 2 points for a fully vertical trajectory", () => {
        const trajectory = [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3],
        ];
        const result = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectory);

        expect(result.simplifiedWellboreTrajectoryXy).toEqual([
            [0, 0],
            [0, 0],
        ]);
    });

    test("should extend a trajectory with the given length, following the angle of the trajectory", () => {
        const trajectoryXward = [
            [0, 0, 0],
            [1, 0, 0],
            [2, 0, 0],
            [3, 0, 0],
        ];

        const trajectoryYward = [
            [0, 0, 0],
            [0, 1, 0],
            [0, 2, 0],
            [0, 3, 0],
        ];

        const resultX = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectoryXward, 2);
        expect(resultX.simplifiedWellboreTrajectoryXy).toEqual([
            [-2, 0],
            [0, 0],
            [3, 0],
            [5, 0],
        ]);
        const resultY = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectoryYward, 2);
        expect(resultY.simplifiedWellboreTrajectoryXy).toEqual([
            [0, -2],
            [0, 0],
            [0, 3],
            [0, 5],
        ]);
    });

    test("A fully vertical trajectory should extend in the x direction", () => {
        const trajectory = [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3],
        ];
        const result = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(trajectory, 2);

        expect(result.simplifiedWellboreTrajectoryXy).toEqual([
            [-2, 0],
            [0, 0],
            [0, 0],
            [2, 0],
        ]);
    });
});

describe("zipTrajectoryCoords", () => {
    test("should zip coordinates correctly", () => {
        const trajectory = {
            eastingArr: [1, 2, 3],
            northingArr: [4, 5, 6],
            tvdMslArr: [7, 8, 9],
        } as MinimalWellboreTrajectory;

        const result = zipTrajectoryCoords(trajectory);

        expect(result).toEqual([
            [1, 4, 7],
            [2, 5, 8],
            [3, 6, 9],
        ]);
    });

    test("should invert Z-axis if specified", () => {
        const trajectory = {
            eastingArr: [1, 2, 3],
            northingArr: [4, 5, 6],
            tvdMslArr: [7, 8, 9],
        } as MinimalWellboreTrajectory;

        const result = zipTrajectoryCoords(trajectory, true);

        expect(result).toEqual([
            [1, 4, -7],
            [2, 5, -8],
            [3, 6, -9],
        ]);
    });
});

describe("zipTrajectoryCoord", () => {
    test("should zip a single coordinate correctly", () => {
        const trajectory = {
            eastingArr: [1, 2, 3],
            northingArr: [4, 5, 6],
            tvdMslArr: [7, 8, 9],
        } as MinimalWellboreTrajectory;

        const result = zipTrajectoryCoord(trajectory, 1);
        expect(result).toEqual([2, 5, 8]);
    });

    test("should throw an error if index is out of bounds", () => {
        const trajectory = {
            eastingArr: [1, 2, 3],
            northingArr: [4, 5, 6],
            tvdMslArr: [7, 8, 9],
        } as MinimalWellboreTrajectory;

        expect(() => zipTrajectoryCoord(trajectory, 5)).toThrow("Segment index 5 is out of bounds.");
    });
});

describe("getLengthAlongSegment", () => {
    test("should return the correct length along a segment", () => {
        const trajectory = {
            mdArr: [0, 5, 10, 15],
        } as MinimalWellboreTrajectory;

        const result = getLengthAlongSegment(trajectory, 0, 1, 3);
        expect(result).toBe(0.6);
    });

    test("should return 0 if segment is of length 0", () => {
        const trajectory = {
            mdArr: [0, 5, 5, 10],
        } as MinimalWellboreTrajectory;

        const result = getLengthAlongSegment(trajectory, 1, 2, 0);
        expect(result).toBe(0);
    });

    test("should return 0 if md is less than mdStart", () => {
        const trajectory = {
            mdArr: [0, 5, 10, 15],
        } as MinimalWellboreTrajectory;

        const result = getLengthAlongSegment(trajectory, 1, 2, 3);
        expect(result).toBe(0);
    });

    test("should return 1 if md is greater than mdEnd", () => {
        const trajectory = {
            mdArr: [0, 5, 10, 15],
        } as MinimalWellboreTrajectory;

        const result = getLengthAlongSegment(trajectory, 1, 2, 12);
        expect(result).toBe(1);
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

        expect(result).toMatchObject({
            type: "Feature",
            geometry: {
                type: "GeometryCollection",
                geometries: [
                    {
                        type: "Point",
                        coordinates: [1, 3, 5],
                    },
                    {
                        type: "LineString",
                        coordinates: [
                            [1, 3, 5],
                            [2, 4, 6],
                        ],
                    },
                ],
            },
            properties: {
                md: [[0, 1]],
                uuid: "uuid",
                uwi: "uwi",
            },
        });
    });

    test("should invert z-axis if option is provided", () => {
        const trajectory = {
            eastingArr: [1, 2],
            northingArr: [3, 4],
            tvdMslArr: [5, 6],
            wellboreUuid: "uuid",
            uniqueWellboreIdentifier: "uwi",
            mdArr: [0, 1],
        };
        const result = wellTrajectoryToGeojson(trajectory, {
            invertZAxis: true,
        });

        expect((result.geometry.geometries[0] as any).coordinates).toEqual([1, 3, -5]);
        expect((result.geometry.geometries[1] as any).coordinates).toEqual([
            [1, 3, -5],
            [2, 4, -6],
        ]);
    });

    test("should highlight the trajectory if trajectory is selected", () => {
        const trajectory = {
            eastingArr: [1, 2],
            northingArr: [3, 4],
            tvdMslArr: [5, 6],
            wellboreUuid: "uuid",
            uniqueWellboreIdentifier: "uwi",
            mdArr: [0, 1],
        };

        const result1 = wellTrajectoryToGeojson(trajectory, {
            selectedWellboreUuid: "uuid",
        });

        expect(result1.properties).toMatchObject({
            color: [255, 0, 0],
            lineWidth: 5,
            wellHeadSize: 10,
        });

        const result2 = wellTrajectoryToGeojson(trajectory, {
            selectedWellboreUuid: "some-other-uuid",
        });

        expect(result2.properties).toMatchObject({
            color: [150, 150, 150],
            lineWidth: 3,
            wellHeadSize: 1,
        });
    });
});

describe("interpolateSegmentPosition", () => {
    test("should interpolate the position along a trajectory segment", () => {
        const trajectory = {
            eastingArr: [0, 10],
            northingArr: [0, 10],
            tvdMslArr: [0, 10],
        } as MinimalWellboreTrajectory;

        const result = interpolateSegmentPosition(trajectory, 0, 1, 0.2);

        expect(result).toEqual([2, 2, -2]);
    });
});

describe("simplifyWellTrajectory", () => {
    /** Builds a trajectory where point `i` has MD `i * 10`, so `mdArr` shows which points survived */
    function makeTrajectory(points: [easting: number, northing: number, tvdMsl: number][]) {
        return {
            eastingArr: points.map((p) => p[0]),
            northingArr: points.map((p) => p[1]),
            tvdMslArr: points.map((p) => p[2]),
            mdArr: points.map((_, i) => i * 10),
        };
    }

    /** Points spaced along easting */
    function straightLine(...eastings: number[]) {
        return makeTrajectory(eastings.map((e) => [e, 0, 0]));
    }

    describe("threshold is a distance, in the same unit as the trajectory", () => {
        test("keeps a point once it is further than the threshold from the last kept point", () => {
            const result = simplifyWellTrajectory(straightLine(0, 1, 2, 3, 4, 5), 1.5);
            expect(result.mdArr).toEqual([0, 20, 40, 50]);
        });

        test("works for thresholds below 1", () => {
            const result = simplifyWellTrajectory(straightLine(0, 0.3, 0.6, 0.9), 0.5);
            expect(result.mdArr).toEqual([0, 20, 30]);
        });

        test("drops a point exactly at the threshold", () => {
            const result = simplifyWellTrajectory(straightLine(0, 1.5, 3, 4.5, 6), 1.5);
            expect(result.mdArr).toEqual([0, 20, 40]);
        });
    });

    describe("endpoints", () => {
        test("always keeps the first and last point", () => {
            const result = simplifyWellTrajectory(straightLine(0, 1, 2), 10);
            expect(result.mdArr).toEqual([0, 20]);
        });

        test("handles single-point and empty trajectories", () => {
            expect(simplifyWellTrajectory(straightLine(0), 1.5).mdArr).toEqual([0]);
            expect(simplifyWellTrajectory(straightLine(), 1.5).mdArr).toEqual([]);
        });
    });

    test("keeps all arrays aligned to the same source points", () => {
        const trajectory = makeTrajectory([
            [0, 0, 0],
            [1, 0, 0],
            [5, 6, 7],
            [5, 6, 8],
        ]);
        expect(simplifyWellTrajectory(trajectory, 2)).toEqual({
            eastingArr: [0, 5, 5],
            northingArr: [0, 6, 6],
            tvdMslArr: [0, 7, 8],
            mdArr: [0, 20, 30],
        });
    });

    describe("distance function", () => {
        const vertical = makeTrajectory([
            [0, 0, 0],
            [0, 0, 10],
            [0, 0, 20],
            [0, 0, 30],
        ]);

        test("defaults to 3D distance, so vertical sections are kept", () => {
            expect(simplifyWellTrajectory(vertical, 3).mdArr).toEqual([0, 10, 20, 30]);
        });

        test("uses the given distance function", () => {
            expect(simplifyWellTrajectory(vertical, 3, trajectoryDistanceXY).mdArr).toEqual([0, 30]);
        });
    });

    test("keeps other trajectory fields and does not mutate the input", () => {
        const input = { ...straightLine(0, 1, 2, 3), wellboreUuid: "abc" };
        const snapshot = structuredClone(input);

        const result = simplifyWellTrajectory(input, 1.5);

        expect(result.wellboreUuid).toBe("abc");
        expect(input).toEqual(snapshot);
    });
});

describe("isInMdRange", () => {
    test("should return true if MD is within range", () => {
        const trajectory = { mdArr: [0, 10, 20] } as MinimalWellboreTrajectory;
        expect(isInMdRange(trajectory, 15)).toBe(true);
    });

    test("should have inclusive beginning and end", () => {
        const trajectory = { mdArr: [0, 10, 20] } as MinimalWellboreTrajectory;
        expect(isInMdRange(trajectory, 0)).toBe(true);
        expect(isInMdRange(trajectory, 20)).toBe(true);
    });

    test("should return false if MD is out of range", () => {
        const trajectory = { mdArr: [10, 15, 20] } as MinimalWellboreTrajectory;
        expect(isInMdRange(trajectory, 25)).toBe(false);
        expect(isInMdRange(trajectory, 5)).toBe(false);
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
