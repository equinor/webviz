import { WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { atom } from "jotai";
import _ from "lodash";

import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export const intersectionReferenceSystemAtom = atom<IntersectionReferenceSystem | null>((get) => {
    const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);

    if (wellboreTrajectoryQuery.isPending || wellboreTrajectoryQuery.isError) return null;

    const systemPath = trajectoryToRefferenceSystemPath(wellboreTrajectoryQuery.data);
    const offset = wellboreTrajectoryQuery.data.mdArr[0];

    const referenceSystem = new IntersectionReferenceSystem(systemPath);

    referenceSystem.offset = offset;

    return referenceSystem;
});

function trajectoryToRefferenceSystemPath(trajectory: WellboreTrajectory_api): number[][] {
    return _.zipWith(trajectory.eastingArr, trajectory.northingArr, trajectory.tvdMslArr, (easting, northing, tvd) => {
        return [easting, northing, tvd];
    });
}
