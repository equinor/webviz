import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { point2Distance, vec2FromArray } from "@lib/utils/vec2";
import { CURVE_FITTING_EPSILON } from "@modules/Intersection/typesAndEnums";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { atom } from "jotai";

import {
    intersectionExtensionLengthAtom,
    intersectionTypeAtom,
    selectedCustomIntersectionPolylineIdAtom,
} from "./baseAtoms";
import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export const selectedCustomIntersectionPolylineAtom = atom((get) => {
    const customIntersectionPolylineId = get(selectedCustomIntersectionPolylineIdAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);

    return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
});

export const intersectionReferenceSystemAtom = atom((get) => {
    const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);
    const customIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
    const intersectionType = get(intersectionTypeAtom);

    if (intersectionType === IntersectionType.WELLBORE) {
        if (!wellboreTrajectoryQuery.data) {
            return null;
        }

        const wellboreTrajectory = wellboreTrajectoryQuery.data;

        if (wellboreTrajectoryQuery) {
            const path: number[][] = [];
            for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
                const easting = wellboreTrajectory.eastingArr[index];
                const tvd_msl = wellboreTrajectory.tvdMslArr[index];

                path.push([easting, northing, tvd_msl]);
            }
            const offset = wellboreTrajectory.mdArr[0];

            const referenceSystem = new IntersectionReferenceSystem(path);
            referenceSystem.offset = offset;

            return referenceSystem;
        }
    } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
        if (customIntersectionPolyline.points.length < 2) {
            return null;
        }
        const referenceSystem = new IntersectionReferenceSystem(
            customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
        );
        referenceSystem.offset = 0;

        return referenceSystem;
    }

    return null;
});

export const polylineAtom = atom((get) => {
    const intersectionType = get(intersectionTypeAtom);
    const intersectionExtensionLength = get(intersectionExtensionLengthAtom);
    const selectedCustomIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
    const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);

    const polylineUtmXy: number[] = [];
    const actualSectionLengths: number[] = [];

    if (intersectionReferenceSystem) {
        if (intersectionType === IntersectionType.WELLBORE) {
            const path = intersectionReferenceSystem.path;
            const simplifiedCurveResult = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                path,
                intersectionExtensionLength,
                CURVE_FITTING_EPSILON
            );
            polylineUtmXy.push(...simplifiedCurveResult.simplifiedWellboreTrajectoryXy.flat());
            actualSectionLengths.push(...simplifiedCurveResult.actualSectionLengths);
        } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && selectedCustomIntersectionPolyline) {
            for (const [index, point] of selectedCustomIntersectionPolyline.points.entries()) {
                polylineUtmXy.push(point[0], point[1]);
                if (index > 0) {
                    const previousPoint = selectedCustomIntersectionPolyline.points[index - 1];
                    actualSectionLengths.push(point2Distance(vec2FromArray(point), vec2FromArray(previousPoint)));
                }
            }
        }
    }

    return {
        polylineUtmXy,
        actualSectionLengths,
    };
});
