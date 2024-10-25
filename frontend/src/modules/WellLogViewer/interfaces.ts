import { WellboreHeader_api, WellboreLogCurveHeader_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";

import {
    firstEnsembleInSelectedFieldAtom,
    requiredCurvesAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
    selectedWellborePicksAtom,
    wellLogTemplateTracksAtom,
} from "./settings/atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";
import { TemplateTrackConfig } from "./types";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    firstEnsembleInSelectedFieldAtom: Ensemble | null;
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    templateTracks: TemplateTrackConfig[];
    viewerHorizontal: boolean;
    padDataWithEmptyRows: boolean;
    selectedWellborePicks: WellPicksLayerData;
    requiredCurves: WellboreLogCurveHeader_api[];
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    firstEnsembleInSelectedFieldAtom: (get) => get(firstEnsembleInSelectedFieldAtom),
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreHeaderAtom),
    templateTracks: (get) => get(wellLogTemplateTracksAtom),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
    padDataWithEmptyRows: (get) => get(padDataWithEmptyRowsAtom),
    selectedWellborePicks: (get) => get(selectedWellborePicksAtom),
    requiredCurves: (get) => get(requiredCurvesAtom),
};
