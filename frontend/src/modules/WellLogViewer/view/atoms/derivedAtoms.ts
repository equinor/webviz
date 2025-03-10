import type { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { atom } from "jotai";
import _ from "lodash";

import { requiredCurvesAtom } from "./baseAtoms";
import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export const intersectionReferenceSystemAtom = atom<IntersectionReferenceSystem | null>((get) => {
    const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);

    if (wellboreTrajectoryQuery.isPending || wellboreTrajectoryQuery.isError) return null;
    if (!wellboreTrajectoryQuery.data) return null;

    const systemPath = trajectoryToReferenceSystemPath(wellboreTrajectoryQuery.data);
    const offset = wellboreTrajectoryQuery.data.mdArr[0];

    const referenceSystem = new IntersectionReferenceSystem(systemPath);

    referenceSystem.offset = offset;

    return referenceSystem;
});

function trajectoryToReferenceSystemPath(trajectory: WellboreTrajectory_api): number[][] {
    return _.zipWith(trajectory.eastingArr, trajectory.northingArr, trajectory.tvdMslArr, (easting, northing, tvd) => {
        return [easting, northing, tvd];
    });
}

// The Subsurface template pattern is exceptionally cumbersome and only uses curve name both for data lookup and curve titles
// (with no way to override it, or specify a log run). This atom provides a list of all curve names that are not unique
// across all selected curves, allowing us to override the names when adding them to the track
export const nonUniqueCurveNamesAtom = atom<Set<string>>((get) => {
    const requiredCurves = get(requiredCurvesAtom);

    const seenNames = new Set<string>();
    const nonUniqueNames = new Set<string>();

    requiredCurves.forEach(({ curveName }) => {
        if (seenNames.has(curveName)) nonUniqueNames.add(curveName);
        else seenNames.add(curveName);
    });

    return nonUniqueNames;
});
