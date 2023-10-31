import { WellBoreTrajectory_api } from "@api";
import { IntersectionReferenceSystem, Trajectory } from "@equinor/esv-intersection";

import { SeismicFenceData_trans } from "./queryDataTransforms";

/**
 * Utility to make extended trajectory object from wellbore trajectory and extension
 */
export function makeExtendedTrajectoryFromWellboreTrajectory(
    wellboreTrajectory: WellBoreTrajectory_api,
    extension: number
): Trajectory {
    const eastingArr = wellboreTrajectory.easting_arr;
    const northingArr = wellboreTrajectory.northing_arr;
    const tvdArr = wellboreTrajectory.tvd_msl_arr;
    const trajectory = eastingArr.map((easting: number, idx: number) => [
        parseFloat(easting.toFixed(3)),
        parseFloat(northingArr[idx].toFixed(3)),
        parseFloat(tvdArr[idx].toFixed(3)),
    ]);

    // If the first and last coordinates are the same, the trajectory is assumed to be a vertical line. In this case,
    // add a coordinate at the start and end of the trajectory to ensure that the trajectory is not considered a vertical line.
    if (eastingArr[0] == eastingArr[eastingArr.length - 1] && northingArr[0] == northingArr[northingArr.length - 1]) {
        const addcoordatstart = eastingArr[0] - 100;
        const addcoordatend = eastingArr[eastingArr.length - 1] + 100;
        const addcoordatstart2 = northingArr[0] - 100;
        const addcoordatend2 = northingArr[northingArr.length - 1] + 100;
        const firstzcoord = tvdArr[0];
        const lastzcoord = tvdArr[tvdArr.length - 1];

        trajectory.unshift([addcoordatstart, addcoordatstart2, firstzcoord]);
        trajectory.push([addcoordatend, addcoordatend2, lastzcoord]);
    }

    const referenceSystem = new IntersectionReferenceSystem(trajectory);
    referenceSystem.offset = trajectory[0][2]; // Offset should be md at start of path

    const displacement = referenceSystem.displacement || 1;
    // Number of samples. Needs some thought.
    const samplingIncrement = 5; //meters
    const steps = Math.min(1000, Math.floor((displacement + extension * 2) / samplingIncrement));
    console.debug("Number of samples for intersection ", steps);

    const extendedTrajectory = referenceSystem.getExtendedTrajectory(steps, extension, extension);
    extendedTrajectory.points = extendedTrajectory.points.map((point) => [
        parseFloat(point[0].toFixed(3)),
        parseFloat(point[1].toFixed(3)),
    ]);

    return extendedTrajectory;
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
