import { WellboreHeader_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import {
    allSelectedGeologyCurvesAtom,
    allSelectedWellLogCurvesAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
    selectedWellborePicksAtom,
    wellLogTemplateTracks,
} from "./settings/atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";
import { TemplatePlotConfig } from "./types";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    templateTracks: TemplateTrack[];
    viewerHorizontal: boolean;
    padDataWithEmptyRows: boolean;
    selectedWellborePicks: WellPicksLayerData;

    requiredWellLogCurves: string[];
    requiredGeologyCurves: TemplatePlotConfig[];
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreHeaderAtom),
    templateTracks: (get) => get(wellLogTemplateTracks),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
    padDataWithEmptyRows: (get) => get(padDataWithEmptyRowsAtom),
    selectedWellborePicks: (get) => get(selectedWellborePicksAtom),
    requiredWellLogCurves: (get) => get(allSelectedWellLogCurvesAtom),
    requiredGeologyCurves: (get) => get(allSelectedGeologyCurvesAtom),
};
