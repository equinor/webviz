import { WellboreTrajectory_api, getWellTrajectoriesOptions } from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedFieldIdentAtom, wellboreHeaderAtom } from "./baseAtoms";

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    // Getting the settings atom via the interface for clearer seperation
    const wellboreUuid = get(wellboreHeaderAtom)?.wellboreUuid ?? "";
    const fieldIdent = get(selectedFieldIdentAtom) ?? "";

    return {
        ...getWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdent ?? "",
                wellbore_uuids: [wellboreUuid],
            },
        }),
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: Boolean(wellboreUuid),
    };
});
