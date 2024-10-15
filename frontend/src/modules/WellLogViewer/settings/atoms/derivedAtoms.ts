import { StratigraphicUnit_api, WellLogCurveTypeEnum_api, WellboreHeader_api } from "@api";
import { transformFormationData } from "@equinor/esv-intersection";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { TemplatePlot, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

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

export const wellLogTemplateTracks = atom<TemplateTrack[]>((get) => {
    const templateTrackConfigs = get(logViewerTrackConfigs);

    return templateTrackConfigs.map((config): TemplateTrack => {
        return {
            ...config,
            plots: config.plots.filter(({ _isValid }) => _isValid) as TemplatePlot[],
        };
    });
});

type PossibleCurveGroups = "geology" | "welllog" | "stratigraphy";

export const plotConfigsBySourceAtom = atom((get) => {
    const templateConfig = get(logViewerTrackConfigs);

    const curveGroups: Record<PossibleCurveGroups, TemplatePlotConfig[]> = {
        geology: [],
        welllog: [],
        stratigraphy: [],
    };

    templateConfig.forEach((track) => {
        const trackCurves = _.groupBy(track.plots, "_source");
        _.mergeWith(curveGroups, trackCurves, (n, s) => {
            if (_.isArray(n)) return n.concat(s);
        });
    });

    return curveGroups;
});

export const allSelectedGeologyCurvesAtom = atom<TemplatePlotConfig[]>((get) => {
    const geolPlots = get(plotConfigsBySourceAtom).geology;

    return _.chain(geolPlots).filter("_isValid").uniqBy("_sourceId").value();
});

export const allSelectedStratigraphyCurves = atom<TemplatePlotConfig[]>((get) => {
    const geolPlots = get(plotConfigsBySourceAtom).stratigraphy;

    return _.chain(geolPlots).filter("_isValid").uniqBy("_sourceId").value();
});

export const allSelectedWellLogCurvesAtom = atom<string[]>((get): string[] => {
    const welllogPlots = get(plotConfigsBySourceAtom).welllog;

    return _.chain(welllogPlots)
        .flatMap(({ name, name2, _isValid }) => {
            if (!_isValid || !name) return [];
            else if (name2) return [name, name2];
            else return [name];
        })
        .uniq()
        .value();
});

/**
 * Returns a list of all user-selected curves that have no available curve-header
 */
export const missingCurvesAtom = atom<string[]>((get) => {
    const allSelectedWellLogCurves = get(allSelectedWellLogCurvesAtom);
    const curveHeadersQuery = get(wellLogCurveHeadersQueryAtom);

    // While loading, assume all curves are "available" (since they *most likely* are)
    if (!curveHeadersQuery.data) return [];

    const missingNames: string[] = [];

    allSelectedWellLogCurves.forEach((selectedName) => {
        if (!curveHeadersQuery.data.some(({ curveName }) => curveName === selectedName)) {
            missingNames.push(selectedName);
        }
    });

    return missingNames;
});
