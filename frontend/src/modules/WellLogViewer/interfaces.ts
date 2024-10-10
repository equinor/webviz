import { WellboreHeader_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import {
    allSelectedWellLogCurvesAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreAtom,
    selectedWellborePicksAtom,
    wellLogTemplateTracks,
} from "./settings/atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "./settings/atoms/persistedAtoms";

export type InterfaceTypes = {
    settingsToView: SettingsToViewInterface;
};

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader_api | null;
    requiredDataCurves: string[];
    templateTracks: TemplateTrack[];
    viewerHorizontal: boolean;
    padDataWithEmptyRows: boolean;
    selectedWellborePicks: WellPicksLayerData;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreAtom),
    templateTracks: (get) => get(wellLogTemplateTracks),
    requiredDataCurves: (get) => get(allSelectedWellLogCurvesAtom),
    viewerHorizontal: (get) => get(viewerHorizontalAtom),
    padDataWithEmptyRows: (get) => get(padDataWithEmptyRowsAtom),
    selectedWellborePicks: (get) => get(selectedWellborePicksAtom),
};
