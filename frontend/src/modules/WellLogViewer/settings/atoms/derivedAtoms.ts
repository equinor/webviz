import { WellLogCurveTypeEnum_api, WellboreHeader_api, WellboreLogCurveHeader_api, WellborePick_api } from "@api";
import { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";
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
import { logViewerTrackConfigs } from "./persistedAtoms";
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
    const templateTrackConfigs = get(logViewerTrackConfigs);

    return templateTrackConfigs.map((config) => {
        return {
            ...config,
            plots: config.plots.filter(({ _isValid }) => _isValid),
        } as TemplateTrackConfig;
    });
});

export const requiredCurvesAtom = atom<WellboreLogCurveHeader_api[]>((get) => {
    const templateTracks = get(logViewerTrackConfigs);

    return _.chain(templateTracks)
        .flatMap<TemplatePlotConfig>("plots")
        .filter("_isValid") // Do not bother with invalid configs
        .flatMap(({ _curveHeader, _curveHeader2 }) => [_curveHeader, _curveHeader2])
        .filter((header): header is WellboreLogCurveHeader_api => !!header)
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
