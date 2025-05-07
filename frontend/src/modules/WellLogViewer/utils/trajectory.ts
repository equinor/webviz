import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import _ from "lodash";

import type { WellboreTrajectory_api } from "@api";

function trajectoryToReferenceSystemPath(trajectory: WellboreTrajectory_api): number[][] {
    return _.zipWith(trajectory.eastingArr, trajectory.northingArr, trajectory.tvdMslArr, (easting, northing, tvd) => {
        return [easting, northing, tvd];
    });
}

export function trajectoryToIntersectionReference(
    wellboreTrajectory: WellboreTrajectory_api,
): IntersectionReferenceSystem {
    const systemPath = trajectoryToReferenceSystemPath(wellboreTrajectory);
    const offset = wellboreTrajectory.mdArr[0];

    const referenceSystem = new IntersectionReferenceSystem(systemPath);
    referenceSystem.offset = offset;

    return referenceSystem;
}
