import {
    getDrilledWellboreHeadersOptions,
    getStratigraphicUnitsOptions,
    getWellboreLogCurveHeadersOptions,
    getWellborePicksForWellboreOptions,
} from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import {
    firstEnsembleInSelectedFieldAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
} from "./derivedAtoms";

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentifierAtom) ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldId,
            },
        }),
        enabled: Boolean(fieldId),
    };
});

/* ! Note 
  No logs are returned for any of the Drogon wells, afaik. Found a working set using in one of the TROLL ones. Some of them are still on the old system, so just click around until you find a working one

*/
export const wellLogCurveHeadersQueryAtom = atomWithQuery((get) => {
    const wellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid;

    return {
        ...getWellboreLogCurveHeadersOptions({
            query: {
                wellbore_uuid: wellboreUuid ?? "",
            },
        }),
        enabled: Boolean(wellboreUuid),
    };
});

export const wellborePicksQueryAtom = atomWithQuery((get) => {
    const selectedWellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    return {
        ...getWellborePicksForWellboreOptions({
            query: {
                wellbore_uuid: selectedWellboreUuid,
            },
        }),
        enabled: Boolean(selectedWellboreUuid),
    };
});

export const wellboreStratigraphicUnitsQueryAtom = atomWithQuery((get) => {
    // Stratigraphic column will be computed based on the case uuid
    // TODO: Should make it a user-selected ensemble instead, at some point
    const selectedEnsemble = get(firstEnsembleInSelectedFieldAtom);
    const caseUuid = selectedEnsemble?.getCaseUuid() ?? "";

    return {
        ...getStratigraphicUnitsOptions({
            query: {
                case_uuid: caseUuid,
            },
        }),
        enabled: Boolean(caseUuid),
    };
});
