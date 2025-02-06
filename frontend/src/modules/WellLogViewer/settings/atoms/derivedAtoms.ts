import { WellLogCurveTypeEnum_api, WellboreHeader_api, WellboreLogCurveHeader_api, WellborePick_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";

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
    drilledWellboreHeadersQueryAtom,
    wellLogCurveHeadersQueryAtom,
    wellborePicksQueryAtom,
    wellboreStratColumnsQueryAtom,
} from "./queryAtoms";

// ? The module doesnt do anything related to ensembles, should we just make it possible to pick from all fields?
// ? If so, move to queries, and use "apiService.explore.getFields();"
export const selectedFieldIdentifierAtom = atom((get) => {
    const selectedFieldId = get(userSelectedFieldIdentifierAtom);
    const ensembleSet = get(EnsembleSetAtom);

    // ! Per now (24.01.25) delta ensambles are directly tied to the regular ones, and they will never have any fields
    // ! not in the regular set, so we only need to check the regular ones
    const regularEnsembleArray = ensembleSet.getRegularEnsembleArray();

    // Selection-fixup. Default to field ident of first available ensemble if possible
    if (!regularEnsembleArray.length) return null;
    if (regularEnsembleArray.some((ens) => ens.getFieldIdentifier() === selectedFieldId)) return selectedFieldId;

    return regularEnsembleArray[0].getFieldIdentifier();
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
        .uniqBy(({ source, sourceId, logName }) => source + sourceId + logName)
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
