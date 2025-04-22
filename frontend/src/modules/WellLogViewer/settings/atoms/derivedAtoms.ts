import type { WellboreHeader_api, WellboreLogCurveHeader_api, WellborePick_api } from "@api";
import { WellLogCurveTypeEnum_api } from "@api";
import type { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { makeSelectValueForCurveHeader } from "@modules/WellLogViewer/utils/strings";

import { atom } from "jotai";
import _ from "lodash";

import {
    userSelectedFieldIdentifierAtom,
    userSelectedWellPickColumnAtom,
    userSelectedWellPickInterpreterAtom,
    userSelectedWellPicksAtom,
    userSelectedWellboreUuidAtom,
} from "./baseAtoms";
import { logViewerTrackConfigsAtom } from "./persistedAtoms";
import {
    availableFieldsQueryAtom,
    drilledWellboreHeadersQueryAtom,
    wellLogCurveHeadersQueryAtom,
    wellborePicksQueryAtom,
    wellboreStratColumnsQueryAtom,
} from "./queryAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const availableFields = get(availableFieldsQueryAtom).data ?? [];
    const selectedFieldId = get(userSelectedFieldIdentifierAtom);

    // Fixup selected field id
    if (!availableFields.length) return null;
    const selectionIsValid = availableFields.some((field) => field.field_identifier === selectedFieldId);
    return selectionIsValid ? selectedFieldId : availableFields[0].field_identifier;
});

export const selectedWellboreHeaderAtom = atom<WellboreHeader_api | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
    const selectedWellboreId = get(userSelectedWellboreUuidAtom);

    if (!availableWellboreHeaders?.length) {
        return null;
    }

    return availableWellboreHeaders.find((wh) => wh.wellboreUuid === selectedWellboreId) ?? availableWellboreHeaders[0];
});

export const availableContinuousCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom).data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.CONTINUOUS]);
});

export const availableDiscreteCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom).data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.DISCRETE]);
});

export const availableFlagCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom).data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.FLAG]);
});

export const wellLogTemplateTracksAtom = atom<TemplateTrackConfig[]>((get) => {
    const templateTrackConfigs = get(logViewerTrackConfigsAtom);

    return templateTrackConfigs.map((config) => {
        return {
            ...config,
            plots: config.plots.filter(({ _isValid }) => _isValid),
        } as TemplateTrackConfig;
    });
});

export const requiredCurvesAtom = atom<WellboreLogCurveHeader_api[]>((get) => {
    const templateTracks = get(logViewerTrackConfigsAtom);

    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom).data ?? [];
    const availableCurves = _.map(logCurveHeaders, "curveName");

    return _.chain(templateTracks)
        .flatMap<TemplatePlotConfig>("plots")
        .filter("_isValid") // Do not bother with invalid configs
        .flatMap(({ _curveHeader, _curveHeader2 }) => [_curveHeader, _curveHeader2])
        .filter((header): header is WellboreLogCurveHeader_api => !!header)
        .filter((header) => availableCurves.includes(header.curveName))
        .uniqBy(makeSelectValueForCurveHeader)
        .value();
});

export const selectedWellPickColumnAtom = atom<string | null>((get) => {
    const userSelectedWellPickColumn = get(userSelectedWellPickColumnAtom) ?? "";
    const wellboreStratColumns = get(wellboreStratColumnsQueryAtom).data ?? [];

    // Selection-fixup. Defaults to first available option if possible
    if (!wellboreStratColumns.length) return null;
    if (wellboreStratColumns.includes(userSelectedWellPickColumn)) return userSelectedWellPickColumn;
    return wellboreStratColumns[0];
});

export const wellPicksByInterpreterAtom = atom<Record<string, WellborePick_api[]>>((get) => {
    const picks = get(wellborePicksQueryAtom).data ?? [];

    return _.groupBy(picks, "interpreter");
});

export const availableWellPickInterpretersAtom = atom<string[]>((get) => {
    const wellPicksByInterpreter = get(wellPicksByInterpreterAtom);
    return Object.keys(wellPicksByInterpreter);
});

export const selectedWellPickInterpreter = atom<string | null>((get) => {
    const selectedInterpreter = get(userSelectedWellPickInterpreterAtom);
    const availableInterpreters = get(availableWellPickInterpretersAtom);

    // Selection-fixup. Defaults to first available option if possible
    if (!availableInterpreters.length) return null;
    if (selectedInterpreter && availableInterpreters.includes(selectedInterpreter)) return selectedInterpreter;
    return availableInterpreters[0];
});

export const selectedWellborePicksAtom = atom<WellborePick_api[]>((get) => {
    const wellPicksByInterpreter = get(wellPicksByInterpreterAtom);
    const selectedInterpreter = get(selectedWellPickInterpreter);
    const selectedWellPicks = get(userSelectedWellPicksAtom);

    if (!selectedInterpreter) return [];

    const interpreterPicks = wellPicksByInterpreter[selectedInterpreter] ?? [];

    return interpreterPicks.filter(({ pickIdentifier }) => selectedWellPicks.includes(pickIdentifier));
});

export const missingCurvesAtom = atom<WellboreLogCurveHeader_api[]>((get) => {
    const templateTracks = get(logViewerTrackConfigsAtom) ?? [];
    const availableCurvesQuery = get(wellLogCurveHeadersQueryAtom);
    if (availableCurvesQuery.isPending || availableCurvesQuery.isError) return [];

    // Prepare all header select values for faster lookup
    const allCurveSelectValues = new Set(availableCurvesQuery.data.map(makeSelectValueForCurveHeader));

    const missingCurves: WellboreLogCurveHeader_api[] = [];

    const allPlots = _.flatMap(templateTracks, "plots") as TemplatePlotConfig[];

    allPlots.forEach(({ _curveHeader, _curveHeader2 }) => {
        const selectValue1 = makeSelectValueForCurveHeader(_curveHeader);
        const selectValue2 = makeSelectValueForCurveHeader(_curveHeader2);

        if (_curveHeader && !allCurveSelectValues.has(selectValue1)) missingCurves.push(_curveHeader!);
        if (_curveHeader2 && !allCurveSelectValues.has(selectValue2)) missingCurves.push(_curveHeader2!);
    });

    return missingCurves;
});
