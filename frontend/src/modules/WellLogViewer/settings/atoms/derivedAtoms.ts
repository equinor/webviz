import { WellboreHeader_api, WellboreLogCurveHeader_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { TemplatePlot, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { atom } from "jotai";
import _, { Dictionary } from "lodash";

import { logViewerTrackConfigs, userSelectedFieldIdentifierAtom, userSelectedWellboreUuidAtom } from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom, wellLogCurveHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const ensembleSetArr = get(EnsembleSetAtom).getEnsembleArr();
    const selectedFieldIdentifier = get(userSelectedFieldIdentifierAtom);

    if (ensembleSetArr.length < 1) {
        return null;
    } else if (ensembleSetArr.some((e) => e.getFieldIdentifier() === selectedFieldIdentifier)) {
        return selectedFieldIdentifier;
    } else {
        return ensembleSetArr[0].getFieldIdentifier();
    }
});

export const selectedWellboreAtom = atom<WellboreHeader_api | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
    const selectedWellboreId = get(userSelectedWellboreUuidAtom);

    return getSelectedWellboreHeader(selectedWellboreId, availableWellboreHeaders);
});

export const groupedCurveHeadersAtom = atom<Dictionary<WellboreLogCurveHeader_api[]>>((get) => {
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

export const allSelectedWellLogCurves = atom<string[]>((get) => {
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

function getSelectedWellboreHeader(
    currentId: string | null,
    wellboreHeaderSet: WellboreHeader_api[] | null | undefined
): WellboreHeader_api | null {
    if (!wellboreHeaderSet || wellboreHeaderSet.length < 1) {
        return null;
    }

    if (!currentId) {
        return wellboreHeaderSet[0];
    }

    return wellboreHeaderSet.find((wh) => wh.wellboreUuid === currentId) ?? wellboreHeaderSet[0];
}
