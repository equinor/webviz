import { WellBorePicksAndStratigraphicUnits_api, WellBoreTrajectory_api } from "@api";
import { IntersectionReferenceSystem, Trajectory, transformFormationData } from "@equinor/esv-intersection";

import { SeismicFenceData_trans } from "./queryDataTransforms";

/**
 * Utility to make extended trajectory object from array of 3D trajectory coordinates [x,y,z] and extension
 *
 * TODO: Number of samples. Needs some thought for future, perhaps detect num samples based on seismic metadata?
 */
export function makeExtendedTrajectoryFromTrajectoryXyzPoints(
    trajectoryXyzPoints: number[][],
    extension: number,
    samplingIncrementMeters = 5
): Trajectory {
    const isVertical = isVerticalTrajectory(trajectoryXyzPoints);
    if (isVertical) {
        // Adds extension to top and bottom of vertical line
        trajectoryXyzPoints = addStartAndEndPointsToTrajectoryForVerticalLine(trajectoryXyzPoints, extension);
    }

    const referenceSystem = new IntersectionReferenceSystem(trajectoryXyzPoints);

    // Offset: md at start of well path
    referenceSystem.offset = trajectoryXyzPoints[0][2];

    const displacement = referenceSystem.displacement ?? 1;
    const numPoints = Math.min(1000, Math.floor((displacement + extension * 2) / samplingIncrementMeters));
    const extendedTrajectory = isVertical
        ? referenceSystem.getTrajectory(numPoints)
        : referenceSystem.getExtendedTrajectory(numPoints, extension, extension);

    extendedTrajectory.points.forEach((point) => {
        point[0] = parseFloat(point[0].toFixed(3));
        point[1] = parseFloat(point[1].toFixed(3));
    });

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
function addStartAndEndPointsToTrajectoryForVerticalLine(
    trajectoryXyzPoints: number[][],
    extension: number
): number[][] {
    if (trajectoryXyzPoints.length === 0) return [];

    const firstCoordinates = trajectoryXyzPoints[0];
    const lastCoordinates = trajectoryXyzPoints[trajectoryXyzPoints.length - 1];

    if (firstCoordinates.length !== 3 || lastCoordinates.length !== 3) {
        throw new Error("First and last coordinates of trajectory must be 3D coordinates of length 3");
    }

    const modifiedTrajectoryXyzPoints = [...trajectoryXyzPoints];

    // Compare x (index 0) and y (index 1) coordinates of first and last points
    // Add start and end coordinates to trajectory
    // NOTE: Should be consider to create a 3D vector with length = extension, i.e. extension = sqrt(x^2 + y^2 + z^2), with z constant,
    // i.e. -> x = sqrt(extension) and y = sqrt(extension)?
    const firstXCoord = firstCoordinates[0] - extension;
    const firstYCoord = firstCoordinates[1];
    const firstZCoord = firstCoordinates[2];

    const lastXCoord = lastCoordinates[0] + extension;
    const lastYCoord = lastCoordinates[1];
    const lastZCoord = lastCoordinates[2];

    modifiedTrajectoryXyzPoints.unshift([firstXCoord, firstYCoord, firstZCoord]);
    modifiedTrajectoryXyzPoints.push([lastXCoord, lastYCoord, lastZCoord]);

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
 * num_samples_per_trace = 3
 * fence_traces = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
export function createSeismicSliceImageDataArrayFromFenceData(
    fenceData: SeismicFenceData_trans,
    fillValue = 0
): number[][] {
    const imageArray: number[][] = [];

    const numTraces = fenceData.num_traces;
    const numSamples = fenceData.num_samples_per_trace;
    const fenceValues = fenceData.fenceTracesFloat32Arr;

    for (let i = 0; i < numSamples; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamples;
            const fenceValue = fenceValues[index];
            const validFenceValue = Number.isNaN(fenceValue) ? fillValue : fenceValue;
            row.push(validFenceValue);
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

    const numSamples = fenceData.num_samples_per_trace;
    const minDepth = fenceData.min_fence_depth;
    const maxDepth = fenceData.max_fence_depth;

    for (let i = 0; i < numSamples; ++i) {
        yAxisValues.push(minDepth + ((maxDepth - minDepth) / numSamples) * i);
    }
    return yAxisValues;
}

export type Pick = Parameters<typeof transformFormationData>[0][0];
export type Unit = Parameters<typeof transformFormationData>[1][0];

/**
 * Utility to create an object of wellbore picks and stratigraphic units for the esv intersection layer.
 *
 * Converts the API data to the format required by the esv intersection layer.
 */
export function createEsvWellborePicksAndStratigraphicUnits(
    wellborePicksAndStratigraphicUnits_api: WellBorePicksAndStratigraphicUnits_api
): { wellborePicks: Pick[]; stratigraphicUnits: Unit[] } {
    const wellborePicks: Pick[] = wellborePicksAndStratigraphicUnits_api.wellbore_picks.map((pick) => {
        return {
            pickIdentifier: pick.pickIdentifier,
            confidence: pick.confidence,
            depthReferencePoint: pick.depthReferencePoint,
            md: pick.md,
            mdUnit: pick.mdUnit,
            tvd: pick.tvd,
        };
    });

    // lithologyType and stratUnitParent are defined as number in esv intersection layer, but is retrieved as string
    // from back-end
    const stratigraphicUnits: Unit[] = wellborePicksAndStratigraphicUnits_api.stratigraphic_units.map((unit) => {
        return {
            identifier: unit.identifier,
            top: unit.top,
            base: unit.base,
            baseAge: unit.baseAge,
            topAge: unit.topAge,
            colorR: unit.colorR,
            colorG: unit.colorG,
            colorB: unit.colorB,
            stratUnitLevel: unit.stratUnitLevel,
            lithologyType: unit.lithologyType as number,
            stratUnitParent: unit.stratUnitParent as unknown as number,
        };
    });

    return { wellborePicks: wellborePicks, stratigraphicUnits: stratigraphicUnits };
}
