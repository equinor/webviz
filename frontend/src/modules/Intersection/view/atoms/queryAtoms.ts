import type { WellboreTrajectory_api } from "@api";
import { getWellTrajectoriesOptions } from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedFieldIdentifierAtom, wellboreHeaderAtom } from "./baseAtoms";

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const wellbore = get(wellboreHeaderAtom);
    const fieldIdentifier = get(selectedFieldIdentifierAtom);

    const queryOptions = getWellTrajectoriesOptions({
        query: {
            field_identifier: fieldIdentifier ?? "",
            wellbore_uuids: wellbore?.uuid ? [wellbore.uuid] : [],
        },
    });

    return {
        ...queryOptions,
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: Boolean(wellbore?.uuid) && Boolean(fieldIdentifier),
    };
});
