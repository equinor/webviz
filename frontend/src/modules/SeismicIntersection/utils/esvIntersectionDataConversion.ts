import { WellBoreTrajectory_api } from "@api";
import { IntersectionReferenceSystem, Trajectory } from "@equinor/esv-intersection";

import { SeismicFenceData_trans } from "./queryDataTransforms";

/**
 * Utility to make extended trajectory object from array of 3D trajectory coordinates [x,y,z] and extension
 *
 * TODO: Number of samples. Needs some thought for future
 */
export function makeExtendedTrajectoryFromTrajectoryXyzPoints(
    trajectoryXyzPoints: number[][],
    extension: number,
    samplingIncrementMeters = 5
): Trajectory {
    if (isVerticalTrajectory(trajectoryXyzPoints)) {
        trajectoryXyzPoints = addStartAndEndPointsToTrajectoryForVerticalLine(trajectoryXyzPoints);
    }

    const referenceSystem = new IntersectionReferenceSystem(trajectoryXyzPoints);
    referenceSystem.offset = trajectoryXyzPoints[0][2]; // Offset should be md at start of path

    const displacement = referenceSystem.displacement || 1;

    const numPoints = Math.min(1000, Math.floor((displacement + extension * 2) / samplingIncrementMeters));
    const extendedTrajectory = referenceSystem.getExtendedTrajectory(numPoints, extension, extension);
    extendedTrajectory.points = extendedTrajectory.points.map((point) => [
        parseFloat(point[0].toFixed(3)),
        parseFloat(point[1].toFixed(3)),
    ]);

    return extendedTrajectory;
}

/**
 * Helper function to check if a trajectory made of 3D coordinates [x,y,z] is a vertical line
 *
 * Checks for first coordinate with different x and y coordinates than the first point
 */
function isVerticalTrajectory(trajectoryXyzPoints: number[][]): boolean {
    if (trajectoryXyzPoints.length === 0) return false;

    const firstPoint = trajectoryXyzPoints[0];

    if (firstPoint.length !== 3) {
        throw new Error("First coordinates of trajectory must be 3D coordinates of length 3");
    }

    // Detect first 3D point which is not on the same x and y coordinates as the first point and return false
    for (let i = 1; i < trajectoryXyzPoints.length; ++i) {
        const point = trajectoryXyzPoints[i];
        if (point.length !== 3) {
            throw new Error("Trajectory points must be 3D coordinates of length 3");
        }
        if (point[0] !== firstPoint[0] || point[1] !== firstPoint[1]) {
            return false;
        }
    }

    return true;
}

/**
 * Helper function to add start and end points to array of 3D trajectory coordinates [x,y,z] to prevent pure vertical line
 *
 * This function assumes check of vertical line beforehand, and only performs adding of start and end points
 *
 * @param trajectoryXyzPoints - Array of 3D coordinates [x,y,z]
 */
function addStartAndEndPointsToTrajectoryForVerticalLine(trajectoryXyzPoints: number[][]): number[][] {
    if (trajectoryXyzPoints.length === 0) return [];

    const firstCoordinates = trajectoryXyzPoints[0];
    const lastCoordinates = trajectoryXyzPoints[trajectoryXyzPoints.length - 1];

    if (firstCoordinates.length !== 3 || lastCoordinates.length !== 3) {
        throw new Error("First and last coordinates of trajectory must be 3D coordinates of length 3");
    }

    const modifiedTrajectoryXyzPoints = [...trajectoryXyzPoints];

    // Compare x (index 0) and y (index 1) coordinates of first and last points
    // Add start and end coordinates to trajectory
    const addCoordAtStart = firstCoordinates[0] - 100;
    const addCoordAtEnd = lastCoordinates[0] + 100;
    const addCoordAtStart2 = firstCoordinates[1] - 100;
    const addCoordAtEnd2 = lastCoordinates[1] + 100;
    const firstZCoord = firstCoordinates[2];
    const lastZCoord = lastCoordinates[2];

    modifiedTrajectoryXyzPoints.unshift([addCoordAtStart, addCoordAtStart2, firstZCoord]);
    modifiedTrajectoryXyzPoints.push([addCoordAtEnd, addCoordAtEnd2, lastZCoord]);

    return modifiedTrajectoryXyzPoints;
}

/**
 * Make an array of 3D coordinates [x,y,z] from a wellbore trajectory
 *
 * @param wellboreTrajectory - Wellbore trajectory object
 * @returns Array of 3D coordinates [x,y,z] - with [x,y,z] = [easting, northing, tvd_msl]
 */
export function makeTrajectoryXyzPointsFromWellboreTrajectory(wellboreTrajectory: WellBoreTrajectory_api): number[][] {
    const eastingArr = wellboreTrajectory.easting_arr;
    const northingArr = wellboreTrajectory.northing_arr;
    const tvdArr = wellboreTrajectory.tvd_msl_arr;

    if (eastingArr.length !== northingArr.length && northingArr.length !== tvdArr.length) {
        throw new Error("Wellbore trajectory coordinate arrays are not of same length");
    }

    // Trajectory points: array of 3D coordinates [x,y,z]
    const trajectoryXyzPoints = eastingArr.map((easting: number, idx: number) => [
        parseFloat(easting.toFixed(3)),
        parseFloat(northingArr[idx].toFixed(3)),
        parseFloat(tvdArr[idx].toFixed(3)),
    ]);

    return trajectoryXyzPoints;
}

/**
 * Make a reference system from array of 3D coordinates [x,y,z] defined for a trajectory
 */
export function makeReferenceSystemFromTrajectoryXyzPoints(
    trajectoryXyzPoints: number[][]
): IntersectionReferenceSystem {
    const referenceSystem = new IntersectionReferenceSystem(trajectoryXyzPoints);
    return referenceSystem;
}

/**
 * Utility function to convert the 1D array of values from the fence data to a 2D array of values
 * for the seismic slice image.
 *
 * For the bit map image, the values are provided s.t. a seismic trace is a column in the image,
 * thus the data will be transposed.
 *
 * trace a,b,c and d
 *
 * num_traces = 4
 * num_samples = 3
 * fence_traces = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
export function createSeismicSliceImageDataArrayFromFenceData(fenceData: SeismicFenceData_trans): number[][] {
    const imageArray: number[][] = [];

    const numTraces = fenceData.num_traces;
    const numSamples = fenceData.num_trace_samples;
    const fenceValues = fenceData.fenceTracesFloat32Arr;

    for (let i = 0; i < numSamples; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamples;
            row.push(fenceValues[index]);
        }
        imageArray.push(row);
    }
    return imageArray;
}

/**
 * Utility to create an array of values for the Y axis of the seismic slice image. I.e. depth values
 * for the seismic depth axis.
 */
export function createSeismicSliceImageYAxisValuesArrayFromFenceData(fenceData: SeismicFenceData_trans): number[] {
    const yAxisValues: number[] = [];

    const numSamples = fenceData.num_trace_samples;
    const minDepth = fenceData.min_fence_depth;
    const maxDepth = fenceData.max_fence_depth;

    for (let i = 0; i < numSamples; ++i) {
        yAxisValues.push(minDepth + ((maxDepth - minDepth) / numSamples) * i);
    }
    return yAxisValues;
}
