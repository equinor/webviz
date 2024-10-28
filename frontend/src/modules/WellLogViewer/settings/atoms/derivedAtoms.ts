import { StratigraphicUnit_api, WellLogCurveTypeEnum_api, WellboreHeader_api, WellboreLogCurveHeader_api } from "@api";
import { transformFormationData } from "@equinor/esv-intersection";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { TemplatePlotConfig, TemplateTrackConfig } from "@modules/WellLogViewer/types";

import { atom } from "jotai";
import _ from "lodash";

import {
    userSelectedFieldIdentifierAtom,
    userSelectedNonUnitWellpicksAtom,
    userSelectedUnitWellpicksAtom,
    userSelectedWellboreUuidAtom,
} from "./baseAtoms";
import { logViewerTrackConfigs } from "./persistedAtoms";
import {
    drilledWellboreHeadersQueryAtom,
    wellLogCurveHeadersQueryAtom,
    wellborePicksQueryAtom,
    wellboreStratigraphicUnitsQueryAtom,
} from "./queryAtoms";

export const firstEnsembleInSelectedFieldAtom = atom((get) => {
    const selectedFieldId = get(userSelectedFieldIdentifierAtom);
    const ensembleSetArr = get(EnsembleSetAtom).getEnsembleArr();

    if (!ensembleSetArr.length) {
        return null;
    }

    const selectedEnsemble = ensembleSetArr.find((e) => e.getFieldIdentifier() === selectedFieldId);

    return selectedEnsemble ?? ensembleSetArr[0];
});

export const selectedFieldIdentifierAtom = atom((get) => {
    return get(firstEnsembleInSelectedFieldAtom)?.getFieldIdentifier() ?? null;
});

export const selectedWellboreHeaderAtom = atom<WellboreHeader_api | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
    const selectedWellboreId = get(userSelectedWellboreUuidAtom);

    if (!availableWellboreHeaders?.length) {
        return null;
    }

    return availableWellboreHeaders.find((wh) => wh.wellboreUuid === selectedWellboreId) ?? availableWellboreHeaders[0];
});

export const selectedWellborePicksAtom = atom<WellPicksLayerData>((get) => {
    const wellborePicks = get(availableWellPicksAtom);
    const selectedUnitPicks = get(userSelectedUnitWellpicksAtom);
    const selectedNonUnitPicks = get(userSelectedNonUnitWellpicksAtom);

    if (!wellborePicks) return { unitPicks: [], nonUnitPicks: [] };
    else {
        const unitPicks = wellborePicks.unitPicks.filter((pick) => selectedUnitPicks.includes(pick.name));
        const nonUnitPicks = wellborePicks.nonUnitPicks.filter((pick) =>
            selectedNonUnitPicks.includes(pick.identifier)
        );

        return { unitPicks, nonUnitPicks };
    }
});

export const availableContinuousCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom)?.data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.CONTINUOUS]);
});

export const availableDiscreteCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom)?.data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.DISCRETE]);
});

export const availableFlagCurvesAtom = atom((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom)?.data ?? [];

    return _.filter(logCurveHeaders, ["curveType", WellLogCurveTypeEnum_api.FLAG]);
});

/**
 * Exposing the return type of esv-intersection's transformFormationData, since they don't export that anywhere
 */
export type TransformFormationDataResult = ReturnType<typeof transformFormationData>;
export type WellPicksLayerDataAndUnits = TransformFormationDataResult & { stratUnits: StratigraphicUnit_api[] };

// TODO: We now have the strat units in a seperate query, just use that instead of returning the units here
export const availableWellPicksAtom = atom<WellPicksLayerDataAndUnits>((get) => {
    const wellborePicks = get(wellborePicksQueryAtom).data;
    const wellboreStratUnits = get(wellboreStratigraphicUnitsQueryAtom).data;

    if (!wellborePicks || !wellboreStratUnits) return { nonUnitPicks: [], unitPicks: [], stratUnits: [] };

    // ! transformFormationData mutates the data object, so need to make a copy!
    const stratUnits = [...wellboreStratUnits];
    const transformedPickData = transformFormationData(wellborePicks, wellboreStratUnits as any);

    return {
        nonUnitPicks: _.uniqBy(transformedPickData.nonUnitPicks, "identifier"),
        unitPicks: _.uniqBy(transformedPickData.unitPicks, "name"),
        stratUnits,
    };
});

export const wellLogTemplateTracksAtom = atom<TemplateTrackConfig[]>((get) => {
    const templateTrackConfigs = get(logViewerTrackConfigs);

    return templateTrackConfigs.map((config) => {
        return {
            ...config,
            plots: config.plots.filter(({ _isValid }) => _isValid),
        };
    });
});

export const requiredCurvesAtom = atom<WellboreLogCurveHeader_api[]>((get) => {
    const templateTracks = get(logViewerTrackConfigs);

    return _.chain(templateTracks)
        .flatMap<TemplatePlotConfig>("plots")
        .filter("_isValid") // Implies that curveheader is no longer null
        .flatMap(({ _curveHeader, _curveHeader2 }) => {
            if (!_curveHeader) return [];
            if (!_curveHeader2) return [_curveHeader];
            else return [_curveHeader, _curveHeader2];
        })
        .uniqBy(({ source, sourceId, logName }) => source + sourceId + logName)
        .value();
});
