import { WellboreHeader_api, WellboreLogCurveHeader_api } from "@api";
import { transformFormationData } from "@equinor/esv-intersection";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
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

/**
 * Exposing the return type of esv-intersection's transformFormationData, since they don't export that anywhere
 */
export type TransformFormationDataResult = ReturnType<typeof transformFormationData>;

export const firstEnsembleInSelectedFieldAtom = atom((get) => {
    const selectedFieldId = get(userSelectedFieldIdentifierAtom);
    const regularEnsembleArray = get(EnsembleSetAtom).getRegularEnsembleArray();

    if (!regularEnsembleArray.length) {
        return null;
    }

    const selectedEnsemble = regularEnsembleArray.find((e) => e.getFieldIdentifier() === selectedFieldId);

    return selectedEnsemble ?? regularEnsembleArray[0];
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

export const availableWellPicksAtom = atom<TransformFormationDataResult>((get) => {
    const wellborePicks = get(wellborePicksQueryAtom).data;
    const wellboreStratUnits = get(wellboreStratigraphicUnitsQueryAtom).data;

    if (!wellborePicks || !wellboreStratUnits) return { nonUnitPicks: [], unitPicks: [] };

    const transformedPickData = transformFormationData(wellborePicks, wellboreStratUnits as any);

    return {
        nonUnitPicks: _.uniqBy(transformedPickData.nonUnitPicks, "identifier"),
        unitPicks: _.uniqBy(transformedPickData.unitPicks, "name"),
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

export const groupedCurveHeadersAtom = atom<Record<string, WellboreLogCurveHeader_api[]>>((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom)?.data ?? [];

    return _.groupBy(logCurveHeaders, "logName");
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

export const allSelectedWellLogCurvesAtom = atom<string[]>((get) => {
    const templateTracks = get(wellLogTemplateTracks);

    const curveNames = templateTracks.reduce<string[]>((acc, trackCfg) => {
        const usedCurves = _.flatMap(trackCfg.plots, ({ name, name2 }) => {
            if (name2) return [name, name2];
            else return [name];
        });

        return _.uniq([...acc, ...usedCurves]);
    }, []);

    return curveNames;
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
