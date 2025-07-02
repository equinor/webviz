import { atomWithQuery } from "jotai-tanstack-query";

import type { WellboreTrajectory_api } from "@api";
import { getWellTrajectoriesOptions } from "@api";

import { lockQueriesAtom, selectedFieldIdentAtom, wellboreHeaderAtom } from "./baseAtoms";

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const locked = get(lockQueriesAtom);

    const wellboreUuid = get(wellboreHeaderAtom)?.wellboreUuid ?? "";
    const fieldIdent = get(selectedFieldIdentAtom) ?? "";

    return {
        ...getWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdent,
                wellbore_uuids: [wellboreUuid],
            },
        }),
        select: (data: WellboreTrajectory_api[]): WellboreTrajectory_api | null => data[0] ?? null,
        enabled: Boolean(!locked && fieldIdent && wellboreUuid),
    };
});
