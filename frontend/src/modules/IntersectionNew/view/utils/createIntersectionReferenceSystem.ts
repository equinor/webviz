import type { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";

/**
 * Create an intersection reference system using 3D coordinates from a wellbore trajectory.
 *  *
 * The reference system is created using the wellbore trajectory's easting, northing, and tvd_msl values.
 * Offset is set to the first md value in the trajectory.
 */
export function createIntersectionReferenceSystemFromWellTrajectory(
    wellboreTrajectory: WellboreTrajectory_api,
): IntersectionReferenceSystem {
    const path: number[][] = [];
    for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
        const easting = wellboreTrajectory.eastingArr[index];
        const tvd_msl = wellboreTrajectory.tvdMslArr[index];

        path.push([easting, northing, tvd_msl]);
    }
    const depthOffset = wellboreTrajectory.mdArr[0];

    const intersectionReferenceSystem = new IntersectionReferenceSystem(path);
    intersectionReferenceSystem.offset = depthOffset;

    return intersectionReferenceSystem;
}

/**
 * Create an intersection reference system using 2D coordinates from an intersection polyline.
 *
 * The z value is set to 0 for all points in the polyline.
 */
export function createIntersectionReferenceSystemFromIntersectionPolyline(intersectionPolyline: IntersectionPolyline) {
    const zValue = 0;
    const referenceSystem = new IntersectionReferenceSystem(
        intersectionPolyline.path.map((point) => [point[0], point[1], zValue]),
    );
    referenceSystem.offset = 0;

    return referenceSystem;
}
