import type {
    StratigraphicColumn_api,
    WellboreLogCurveHeader_api} from "@api";
import {
    WellLogCurveSourceEnum_api,
    getDrilledWellboreHeadersOptions,
    getFieldsOptions,
    getWellboreLogCurveHeadersOptions,
    getWellborePicksInStratColumnOptions,
    getWellboreStratigraphicColumnsOptions,
} from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { mergeResults } from "@modules/WellLogViewer/utils/queries";
import type { QueryObserverResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";
import _ from "lodash";

import { selectedFieldIdentifierAtom, selectedWellPickColumnAtom, selectedWellboreHeaderAtom } from "./derivedAtoms";

export const availableFieldsQueryAtom = atomWithQuery(() => {
    return getFieldsOptions();
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentifierAtom) ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        enabled: Boolean(fieldId),
    };
});

/* ! Note 
  No logs are returned for any of the Drogon wells, afaik. Found a working set using in one of the TROLL ones. Some of them are still on the old system, so just click around until you find a working one
*/
export const wellLogCurveHeadersQueryAtom = atomWithQueries((get) => {
    const wellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";
    const sources = [
        WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
        WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
        WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
    ];

    // We *could* fetch all headers within a single query, but doing them seperately here for parallelism
    return {
        queries: sources.map((source) => () => ({
            ...getWellboreLogCurveHeadersOptions({
                query: {
                    wellbore_uuid: wellboreUuid,
                    sources: [source],
                },
            }),
            enabled: Boolean(wellboreUuid),
        })),
        // Flatten the result so we get a single list of headers
        combine(results: QueryObserverResult<WellboreLogCurveHeader_api[], Error>[]) {
            return mergeResults(results, (data) => data.flat());
        },
    };
});

export const wellboreStratColumnsQueryAtom = atomWithQuery((get) => {
    const wellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    return {
        ...getWellboreStratigraphicColumnsOptions({ query: { wellbore_uuid: wellboreUuid } }),
        enabled: Boolean(wellboreUuid),
        select: (data: StratigraphicColumn_api[]): string[] => _.map(data, "identifier"),
    };
});

export const wellborePicksQueryAtom = atomWithQuery((get) => {
    const selectedWellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    const selectedStratColumn = get(selectedWellPickColumnAtom) ?? "";

    return {
        ...getWellborePicksInStratColumnOptions({
            query: {
                wellbore_uuid: selectedWellboreUuid,
                strat_column: selectedStratColumn,
            },
        }),
        enabled: Boolean(selectedWellboreUuid),
    };
});
